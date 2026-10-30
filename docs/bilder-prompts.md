# Képek — generálási promptok

A `public/bilder/` mappában most **feliratozott placeholderek** vannak. Mindegyik
megmondja, mi a helye és milyen méret kell. Ahogy elkészül egy kép, írd felül
ugyanazon a néven — a kódban semmit nem kell átírni.

## Közös stílusjegy

Minden prompt végére ugyanez kerül, hogy a 22 kép egy stúdiónak látszódjon:

```
boutique reformer pilates studio, Swiss, warm minimal interior, pale oak floor,
off-white plaster walls, linen and sand textures, tall windows with soft diffused
daylight, muted sage accents, calm and uncluttered, editorial lifestyle
photography, natural colour grading, 35mm, shallow depth of field
--style raw --v 7
```

Rövidítve lentebb: **[STÍLUS]**.

Két szabály, amit érdemes betartani:

- **Ne használj `--cref`-et vagy `--sref`-et valódi fotóval.** Ha egy valódi
  stúdió vagy egy valódi ember képe a referencia, a generált kép is rá fog
  hasonlítani — pont azt veszítenénk el, amiért az egész anonimizálás készült.
- **Az arcok ne hasonlítsanak senkire.** Ha egy portré felismerhetően valakire
  emlékeztet, generáld újra. Négy arc kell összesen, nem kell hozzá hasonmás.

## Hero, 1600 × 1000 (16:10)

**`hero-reformer.jpg`** — a nyitólap fő képe
```
wide interior shot of a small pilates studio, four reformer machines in a row
facing a mirrored wall, no people, early morning light raking across the floor,
[STÍLUS] --ar 16:10
```

**`hero-studio.jpg`** — matten pilates szekció
```
pilates studio floor with rolled mats, small props basket, wooden bench along the
wall, no people, quiet and bright, [STÍLUS] --ar 16:10
```

## Portré, 800 × 1000 (4:5)

**`owner-portrait-4x5.jpg`** — a tulajdonos
```
portrait of a woman in her early forties, studio owner, calm confident
expression, light knit top, standing beside a reformer, soft window light from
the left, looking at camera, [STÍLUS] --ar 4:5
```

## Csapat, 800 × 800 (1:1)

**`team-aline.jpg`**
```
portrait of a woman in her late twenties, pilates instructor, warm friendly
expression, neutral activewear, blurred studio behind her, [STÍLUS] --ar 1:1
```

**`team-jana.jpg`**
```
portrait of a woman in her mid thirties, pilates instructor, thoughtful calm
expression, neutral activewear, blurred studio behind her, [STÍLUS] --ar 1:1
```

**`team-elin.jpg`**
```
portrait of a woman in her early thirties, pilates instructor, open friendly
expression, neutral activewear, blurred studio behind her, [STÍLUS] --ar 1:1
```

## Reformer-képek, 1200 × 900 (4:3)

**`reformer-wall.jpg`** — a zürichi terem
```
three reformer machines side by side in a bright studio, mirrored wall, nobody
in frame, [STÍLUS] --ar 4:3
```

**`reformer-weit.jpg`**
```
wide view of a reformer studio room from the corner, six machines in three rows,
tall window at the far end, [STÍLUS] --ar 4:3
```

**`reformer-mann.jpg`**
```
a man in his thirties lying on a reformer, footwork position, seen from the side,
focused expression, instructor out of frame, [STÍLUS] --ar 4:3
```

**`reformer-frau3.jpg`**
```
a woman on a reformer, long spine stretch, side view, controlled movement,
[STÍLUS] --ar 4:3
```

**`reformer-step.jpg`**
```
close view of feet and the reformer footbar, straps and springs visible, hands
resting on the carriage, [STÍLUS] --ar 4:3
```

**`reformer-ring.jpg`**
```
hands holding a pilates ring above the chest while lying on a reformer, soft
focus on the ring, [STÍLUS] --ar 4:3
```

**`reformer-plank.jpg`**
```
a woman in a plank position on a reformer carriage, arms straight, side view,
[STÍLUS] --ar 4:3
```

**`reformer-seance.jpg`**
```
small group of four people on reformers in a studio class, instructor walking
between the machines, seen from behind, [STÍLUS] --ar 4:3
```

**`pilates-wand.jpg`** — matten pilates
```
two people on mats doing pilates on a studio floor, instructor kneeling beside
one of them correcting the position, [STÍLUS] --ar 4:3
```

## A zugi stúdió, 1200 × 900 (4:3)

Ezek egy **másik, kisebb teremről** szólnak — más fal, más fény, hogy a két
helyszín ne ugyanaz legyen.

**`zug-wand.jpg`**
```
small pilates studio room with two reformers, warm grey wall, single large
window, no people, [STÍLUS] --ar 4:3
```

**`zug-raum.jpg`**
```
pilates studio room seen from the doorway, four reformers in two rows, wooden
ceiling beams, [STÍLUS] --ar 4:3
```

**`zug-fenster.jpg`**
```
tall studio window with linen curtain half drawn, reformer in the foreground out
of focus, [STÍLUS] --ar 4:3
```

**`zug-ringe.jpg`**
```
pilates props on a wooden shelf, rings, small balls, resistance bands, neatly
arranged, [STÍLUS] --ar 4:3
```

**`zug-symmetrie.jpg`**
```
symmetrical view down the centre of a studio room, a reformer on each side,
window centred at the far end, no people, [STÍLUS] --ar 4:3
```

## Egyéb

**`see-sunset.jpg`** — autogenes Training szekció, 1200 × 900
```
calm Swiss lake at dusk, still water, low mountains in the distance, no people,
muted palette, [STÍLUS] --ar 4:3
```

**`logo.png`** — 240 × 240, átlátszó háttér

Most egy egyszerű „L" betű van körben, placeholderként. Ha logót szeretnél,
ezt vektorban érdemes megcsinálni (Figma, Illustrator), nem generálni — egy
generált logó szinte mindig elmosódott szélű és nem skálázódik. A fejlécben a
„STUDIO LUMEN" szöveg mellett áll, tehát elég egy jel, nem kell szöveget
tartalmaznia.
