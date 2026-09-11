import { followsStroke, strokeTexturePath } from './strokeTexture'
import { thornPath } from './thornGeometry'
import type { Layer } from '../types/layer'
import { artworkRadius } from './layerTree'

/** Alpha patterns and stroke spikes preserve ink color and transparent export backgrounds. */
export function applyLineTexture(layer: Layer, content: string, prefix: string): string {
  const texture = layer.lineTexture ?? 'solid'
  const amount = (layer.textureAmount ?? 75) / 100
  if (texture === 'solid' || amount === 0) return content
  const scale = layer.textureScale ?? 6
  const seed = layer.textureSeed ?? 1
  const extent = artworkRadius(layer)
  const bounds = `x="${-extent}" y="${-extent}" width="${extent * 2}" height="${extent * 2}"`
  const id = `${prefix}-texture`
  if (texture === 'thorns') {
    const path = thornPath(layer)
    // Use currentColor inherited from a safely escaped color attribute.
    const color = ('color' in layer ? layer.color : '#ffffff').replace(
      /[&<>"']/g,
      (char) => `&#${char.charCodeAt(0)};`
    )
    return content + (path ? `<path data-thorns="true" d="${path}" fill="${color}" />` : '')
  }
  if (followsStroke(layer)) {
    const path = strokeTexturePath(layer)
    return `<defs><mask id="${id}" maskUnits="userSpaceOnUse" ${bounds} style="mask-type:luminance"><rect ${bounds} fill="white" /><path d="${path}" fill="black" fill-rule="nonzero" opacity="${amount}" /></mask></defs><g mask="url(#${id})">${content}</g>`
  }
  if (['hatching', 'crosshatch', 'dots', 'scales', 'cracks'].includes(texture)) {
    const marks: Record<string, string> = {
      hatching: `<rect width="${scale * 0.4}" height="${scale}" />`,
      crosshatch: `<path d="M 0 0 L ${scale} ${scale} M 0 ${scale} L ${scale} 0" fill="none" stroke="black" stroke-width="${scale * 0.18}" />`,
      dots: `<circle cx="${scale / 2}" cy="${scale / 2}" r="${scale * 0.32}" />`,
      scales: `<path d="M 0 0 Q ${scale / 2} ${scale} ${scale} 0 M ${-scale / 2} ${scale / 2} Q 0 ${scale * 1.5} ${scale / 2} ${scale / 2} Q ${scale} ${scale * 1.5} ${scale * 1.5} ${scale / 2}" fill="none" stroke="black" stroke-width="${scale * 0.13}" />`,
      cracks: `<path d="M ${scale * 0.2} 0 L ${scale * 0.55} ${scale * 0.3} L ${scale * 0.35} ${scale * 0.6} L ${scale * 0.2} ${scale} M ${scale * 0.35} ${scale * 0.6} L ${scale * 0.8} ${scale * 0.45} L ${scale} ${scale * 0.6} M 0 ${scale * 0.6} L ${scale * 0.35} ${scale * 0.6}" fill="none" stroke="black" stroke-width="${scale * 0.16}" />`,
    }
    return `<defs><pattern id="${id}-pattern" patternUnits="userSpaceOnUse" width="${scale}" height="${scale}" patternTransform="rotate(45) translate(${seed % 100} 0)"><rect width="${scale}" height="${scale}" fill="white" /><g fill="black" opacity="${amount}">${marks[texture]}</g></pattern><mask id="${id}" maskUnits="userSpaceOnUse" ${bounds} style="mask-type:luminance"><rect ${bounds} fill="url(#${id}-pattern)" /></mask></defs><g mask="url(#${id})">${content}</g>`
  }
  const frequency = texture === 'fibers' ? `${1 / scale} ${0.06 / scale}` : `${1 / scale}`
  const contrast = texture === 'worn' ? 7 : 1.5
  const offset = texture === 'worn' ? 2.8 : 0.25
  return `<defs><filter id="${id}" filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" ${bounds} color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="${frequency}" numOctaves="2" seed="${seed}" result="noise" /><feColorMatrix in="noise" type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 ${contrast * amount} 0 0 0 ${1 - amount - offset * amount}" result="textureAlpha" /><feComposite in="SourceGraphic" in2="textureAlpha" operator="in" /></filter></defs><g filter="url(#${id})">${content}</g>`
}
