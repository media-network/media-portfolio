import cheerio from 'cheerio'
import fetch from 'node-fetch'
import querystring from 'querystring'
import readingTime from 'reading-time'
import truncatise from 'truncatise'

import config from '../infrastructure/config'

const normalizePost = (post) => {
  return {
    _raw: post,
    title: post.title,
    slug: post.slug,
    tags: post.tags,
    authors: post.authors,
    publishedAt: Date.parse(post.published_at),
    tags: post.tags
      .map(
        (tag) => ({
          name: tag.name,
          slug: tag.slug
        })
      )
      .sort(
        (prev, next) => prev.name.localeCompare(next.name)
      )
  }
}

const normalizeTag = (tag) => {
  return {
    _raw: tag,
    slug: tag.slug,
    name: tag.name,
    description: tag.description,
    featureImage: tag.feature_image
  }
}

const generateUrl = (path, params) => {
  return [
    `${ config.ghost.url }${ path }`,
    querystring.stringify({
      client_id: config.ghost.clientId,
      client_secret: config.ghost.clientSecret,
      ...params
    })
  ].filter(Boolean).join('?')
}

const transformImages = (post) => {
  const dom = cheerio.load(post._raw.html)

  dom('img').each(function() {
    const img = dom(this)
    const src = img.attr('src')

    img.attr(
      'src',
      (src && src.indexOf('/') === 0) ?
        `${ config.cdnServer }${ src }` :
        src
    )
  })

  const featureImage = (post._raw.feature_image && post._raw.feature_image.indexOf('/') === 0) ?
        `${ config.cdnServer }${ post._raw.feature_image }` :
        post._raw.feature_image

  return {
    ...post,
    html: dom('body').html(),
    featureImage: featureImage
  }
}

const excerpt = (post) => {
  return {
    ...post,
    excerpt: post._raw.custom_excerpt || truncatise(post._raw.html, {
      StripHTML: true,
      TruncateBy: 'words',
      TruncateLength: 30,
      Suffix: '...'
    })
  }
}

const estimateReadingTime = (post) => {
  const { minutes } = readingTime(post.html)

  return {
    ...post,
    readingTime: Math.ceil(minutes)
  }
}

export default {
  async listTags() {
    const url = generateUrl('/tags', {
      limit: 'all'
    })

    const response = await fetch(url)

    if (!(200 <= response.status && response.status <= 299)) {
      throw response.statusText
    }

    const { tags } = await response.json()

    return {
      tags: tags
        .map(normalizeTag)
    }
  },
  async getTag(slug) {
    const url = generateUrl(`/tags/slug/${ slug }`)

    const response = await fetch(url)

    if (!(200 <= response.status && response.status <= 299)) {
      throw response.statusText
    }

    const { tags } = await response.json()

    return {
      tag: tags
        .map(normalizeTag)
        .shift()
    }
  },
  async listPosts(page = 1, slug = null) {
    const options = {}

    if (slug) {
      options.filter = `tags:[${ slug }]`
    }

    const url = generateUrl('/posts', {
      limit: 'all', //20
      page: Number(page),
      include: 'authors,tags',
      ...options
    })

    const response = await fetch(url)

    if (!(200 <= response.status && response.status <= 299)) {
      throw response.statusText
    }

    const { meta, posts } = await response.json()

    return {
      meta,
      posts: posts
        .map(normalizePost)
        .map(transformImages)
        .map(excerpt)
        .map(estimateReadingTime)
    }
  },
  async getPost(slug) {
    const url = generateUrl('/posts', {
      filter: `slug:${ slug }`,
      include: 'authors,tags'
    })

    const response = await fetch(url)

    if (!(200 <= response.status && response.status <= 299)) {
      throw response.statusText
    }

    const { posts } = await response.json()

    return {
      post: posts
        .map(normalizePost)
        .map(transformImages)
        .map(excerpt)
        .map(estimateReadingTime)
        .shift()
    }
  }
}
