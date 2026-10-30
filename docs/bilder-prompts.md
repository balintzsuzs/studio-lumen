# Images — generation prompts

`public/bilder/` currently holds **labelled placeholders**. Each one states
where it belongs and what size is needed. As an image is finished, overwrite
the placeholder under the same name — nothing in the code has to change.

## Shared style anchor

The same block goes at the end of every prompt, so that all 22 images read as
one studio:

```
boutique reformer pilates studio, Swiss, warm minimal interior, pale oak floor,
off-white plaster walls, linen and sand textures, tall windows with soft diffused
daylight, muted sage accents, calm and uncluttered, editorial lifestyle
photography, natural colour grading, 35mm, shallow depth of field
--style raw --v 7
```

Abbreviated below as **[STYLE]**.

Two rules worth keeping:

- **Do not use `--cref` or `--sref` with a real photo.** If a real studio or a
  real person is the reference, the generated image will resemble them — which
  loses exactly what this whole anonymisation was for.
- **No face should resemble anyone.** If a portrait recognisably reminds you of
  someone, generate it again. Four faces are needed in total; none of them has
  to be a likeness.

## Hero, 1600 × 1000 (16:10)

**`hero-reformer.jpg`** — the home page's main image
```
wide interior shot of a small pilates studio, four reformer machines in a row
facing a mirrored wall, no people, early morning light raking across the floor,
[STYLE] --ar 16:10
```

**`hero-studio.jpg`** — the mat Pilates section
```
pilates studio floor with rolled mats, small props basket, wooden bench along the
wall, no people, quiet and bright, [STYLE] --ar 16:10
```

## Portrait, 800 × 1000 (4:5)

**`owner-portrait-4x5.jpg`** — the owner
```
portrait of a woman in her early forties, studio owner, calm confident
expression, light knit top, standing beside a reformer, soft window light from
the left, looking at camera, [STYLE] --ar 4:5
```

## Team, 800 × 800 (1:1)

**`team-aline.jpg`**
```
portrait of a woman in her late twenties, pilates instructor, warm friendly
expression, neutral activewear, blurred studio behind her, [STYLE] --ar 1:1
```

**`team-jana.jpg`**
```
portrait of a woman in her mid thirties, pilates instructor, thoughtful calm
expression, neutral activewear, blurred studio behind her, [STYLE] --ar 1:1
```

**`team-elin.jpg`**
```
portrait of a woman in her early thirties, pilates instructor, open friendly
expression, neutral activewear, blurred studio behind her, [STYLE] --ar 1:1
```

## Reformer images, 1200 × 900 (4:3)

**`reformer-wall.jpg`** — the Zürich room
```
three reformer machines side by side in a bright studio, mirrored wall, nobody
in frame, [STYLE] --ar 4:3
```

**`reformer-weit.jpg`**
```
wide view of a reformer studio room from the corner, six machines in three rows,
tall window at the far end, [STYLE] --ar 4:3
```

**`reformer-mann.jpg`**
```
a man in his thirties lying on a reformer, footwork position, seen from the side,
focused expression, instructor out of frame, [STYLE] --ar 4:3
```

**`reformer-frau3.jpg`**
```
a woman on a reformer, long spine stretch, side view, controlled movement,
[STYLE] --ar 4:3
```

**`reformer-step.jpg`**
```
close view of feet and the reformer footbar, straps and springs visible, hands
resting on the carriage, [STYLE] --ar 4:3
```

**`reformer-ring.jpg`**
```
hands holding a pilates ring above the chest while lying on a reformer, soft
focus on the ring, [STYLE] --ar 4:3
```

**`reformer-plank.jpg`**
```
a woman in a plank position on a reformer carriage, arms straight, side view,
[STYLE] --ar 4:3
```

**`reformer-seance.jpg`**
```
small group of four people on reformers in a studio class, instructor walking
between the machines, seen from behind, [STYLE] --ar 4:3
```

**`pilates-wand.jpg`** — mat Pilates
```
two people on mats doing pilates on a studio floor, instructor kneeling beside
one of them correcting the position, [STYLE] --ar 4:3
```

## The Zug studio, 1200 × 900 (4:3)

These are about a **different, smaller room** — a different wall, different
light, so the two locations do not look like the same place.

**`zug-wand.jpg`**
```
small pilates studio room with two reformers, warm grey wall, single large
window, no people, [STYLE] --ar 4:3
```

**`zug-raum.jpg`**
```
pilates studio room seen from the doorway, four reformers in two rows, wooden
ceiling beams, [STYLE] --ar 4:3
```

**`zug-fenster.jpg`**
```
tall studio window with linen curtain half drawn, reformer in the foreground out
of focus, [STYLE] --ar 4:3
```

**`zug-ringe.jpg`**
```
pilates props on a wooden shelf, rings, small balls, resistance bands, neatly
arranged, [STYLE] --ar 4:3
```

**`zug-symmetrie.jpg`**
```
symmetrical view down the centre of a studio room, a reformer on each side,
window centred at the far end, no people, [STYLE] --ar 4:3
```

## Other

**`see-sunset.jpg`** — the autogenic training section, 1200 × 900
```
calm Swiss lake at dusk, still water, low mountains in the distance, no people,
muted palette, [STYLE] --ar 4:3
```

**`logo.png`** — 240 × 240, transparent background

Right now it is a plain "L" in a circle, as a placeholder. If you want a real
logo, make it in vector (Figma, Illustrator) rather than generating it — a
generated logo almost always has soft edges and does not scale. It sits beside
the words "STUDIO LUMEN" in the header, so a mark is enough; it does not need
to contain any text.
