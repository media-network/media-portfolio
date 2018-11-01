// import css
import './style'

// javascript begin
import Parallax from 'parallax-js'
import randomInt from 'random-int'
import { throttle } from 'throttle-debounce'
// import TWEEN, { createMotion } from 'js/services/motion'

const SIZES = [ 4, 8, 16, 32, 64, 128 ]
const timingFunc = 'cubic-bezier(0.685, 0.020, 0.915, 0.560)'

const listenOnce = (dom, event, eventHandler) => {
  const handler = (...args) => {
    try {
      eventHandler(...args)
    } finally {
      dom.removeEventListener(event, handler)
    }
  }

  dom.addEventListener(event, handler)
}

const createBlock = (viewport, layer, sizeRange, block) => {
  const { width, height } = viewport

  // randomize things
  const size = SIZES[ randomInt(...sizeRange) ]
  const x = randomInt(width)
  const duration = randomInt(4e3, 8e3)
  const latency = randomInt(4e3)

  // set style
  block.style.display = 'block'
  block.style.left = `${ x }px`
  block.style.width = `${ size }px`
  block.style.height = `${ size }px`
  block.style.transform = `translateY(-${ size + 8 }px)`

  // set animation
  block.style.animation = `falling-${ size } ${ duration }ms ${ timingFunc } ${ latency }ms`

  listenOnce(block, 'animationend', () => {
    layer.removeChild(block)

    createBlock(viewport, layer, sizeRange, block)
  })

  layer.appendChild(block)
}

const createScene = (scene, { sizeRange, blocksPerLayer }) => {
  const viewport = {}

  window.addEventListener('resize', throttle(1000, () => {
    // get new rect
    console.log('resize')

    viewport.width = scene.getBoundingClientRect().width
  }))

  // initial viewport size
  const rect = scene.getBoundingClientRect()

  viewport.width = rect.width

  const layers = scene.querySelectorAll('.layer')

  Array.from(layers).forEach((layer) => {
    for (let i = 0; i < blocksPerLayer; i++) {
      createBlock(viewport, layer, sizeRange, document.createElement('div'))
    }
  })

  const parallaxInstance = new Parallax(scene)
}

window.addEventListener('load', () => {
  createScene(document.getElementById('origin-scene'), {
    sizeRange: [ 2, 5 ],
    blocksPerLayer: 2
  })
  createScene(document.getElementById('target-scene'), {
    sizeRange: [ 1, 3 ],
    blocksPerLayer: 24
  })
})
