export interface TemplateDefinition {
  id: string
  name: string
  description: string
  file: string
  thumbnail: string
}

export const TEMPLATES: TemplateDefinition[] = [
  {
    id: 'solar-sigil',
    name: 'Solar Sigil',
    description: 'Concentric rings in warm orange and gold with radial divisions.',
    file: `${import.meta.env.BASE_URL}templates/solar-sigil.mce.json`,
    thumbnail: `${import.meta.env.BASE_URL}templates/thumbnails/solar-sigil.png`,
  },
  {
    id: 'runic-array',
    name: 'Runic Array',
    description: 'Cool cyan-to-violet layers forming a multi-tier array.',
    file: `${import.meta.env.BASE_URL}templates/runic-array.mce.json`,
    thumbnail: `${import.meta.env.BASE_URL}templates/thumbnails/runic-array.png`,
  },
  {
    id: 'crystal-web',
    name: 'Crystal Web',
    description: 'Five silver rings linked by a dense radial grid.',
    file: `${import.meta.env.BASE_URL}templates/crystal-web.mce.json`,
    thumbnail: `${import.meta.env.BASE_URL}templates/thumbnails/crystal-web.png`,
  },
  {
    id: 'arcane-matrix',
    name: 'Arcane Matrix',
    description: 'Two overlapping eight-point stars in rose and violet.',
    file: `${import.meta.env.BASE_URL}templates/arcane-matrix.mce.json`,
    thumbnail: `${import.meta.env.BASE_URL}templates/thumbnails/arcane-matrix.png`,
  },
  {
    id: 'void-circle',
    name: 'Void Circle',
    description: 'A single thick white ring with thirty-six tick marks.',
    file: `${import.meta.env.BASE_URL}templates/void-circle.mce.json`,
    thumbnail: `${import.meta.env.BASE_URL}templates/thumbnails/void-circle.png`,
  },
  {
    id: 'dragons-eye',
    name: "Dragon's Eye",
    description: 'Crimson divided outer frame, dual 8-point stars, and a gold mystic eye at the core.',
    file: `${import.meta.env.BASE_URL}templates/dragons-eye.mce.json`,
    thumbnail: `${import.meta.env.BASE_URL}templates/thumbnails/dragons-eye.png`,
  },
  {
    id: 'celestial-compass',
    name: 'Celestial Compass',
    description: 'Precision compass rose with 72 degree ticks, cardinal lines, and a circular inscription.',
    file: `${import.meta.env.BASE_URL}templates/celestial-compass.mce.json`,
    thumbnail: `${import.meta.env.BASE_URL}templates/thumbnails/celestial-compass.png`,
  },
  {
    id: 'summoners-gate',
    name: "Summoner's Gate",
    description: 'Six-fold violet gate with twisted teal lines, Latin inscription, and a central hexagram.',
    file: `${import.meta.env.BASE_URL}templates/summoners-gate.mce.json`,
    thumbnail: `${import.meta.env.BASE_URL}templates/thumbnails/summoners-gate.png`,
  },
  {
    id: 'storm-circuit',
    name: 'Storm Circuit',
    description: 'Dense yellow storm field with major/minor radial tiers and a central lightning bolt.',
    file: `${import.meta.env.BASE_URL}templates/storm-circuit.mce.json`,
    thumbnail: `${import.meta.env.BASE_URL}templates/thumbnails/storm-circuit.png`,
  },
  {
    id: 'lunar-sanctum',
    name: 'Lunar Sanctum',
    description: 'Steel-blue crescent arc, four concentric inner rings, moon verse inscription, and a silver moon.',
    file: `${import.meta.env.BASE_URL}templates/lunar-sanctum.mce.json`,
    thumbnail: `${import.meta.env.BASE_URL}templates/thumbnails/lunar-sanctum.png`,
  },
  {
    id: 'obsidian-hex',
    name: 'Obsidian Hex',
    description: 'Nested emerald hexagons with violet spokes and a central hexagram sigil.',
    file: `${import.meta.env.BASE_URL}templates/obsidian-hex.mce.json`,
    thumbnail: `${import.meta.env.BASE_URL}templates/thumbnails/obsidian-hex.png`,
  },
]
