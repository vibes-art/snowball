# Snowball

v0.2.0

## Context

A non-standard, zero-dependency JavaScript and WebGL engine for art, experiences and games on the internet.

Example: [Digital Gallery](https://vibes.art/).

It was started to enable [Proscenium](https://www.artblocks.io/collection/proscenium-by-remnynt), my work released on Art Blocks' Curated. It's intended to be an object-oriented snowball of tools that rolls bigger and better over time.

It's unlicensed and open-sourced. You're welcome to use it freely in any way you see fit.

It's the (work-in-progress) Battlestar Galactica of JS engines because it doesn't run arbitrary code outside of what you see here; it's un-networked, making it safe for folks who interact with cryptocurrency or other sensitive materials on the same machine. These properties also make it easier to store the engine on blockchains, like Ethereum, since there's no set of attributions, licenses, or dependencies to wrangle. I've made a small exception for vetted libraries with permissable licenses, found in the external directory.

The code for specific projects and artworks built with this engine will be released in separate repositories and may use a different license or have access restrictions.

## Development

1. From within the top level directory, select a project by creating a symlink:
```
ln -fs projects/my_project_name/index.html index.html
```

2. Once a symlink has been created, you can serve the project:
```
python3 -m http.server
```

3. To run and debug, navigate to:
```
localhost:8000
```

## Blank Canvas

By default, the engine serves a simple example, found in projects/blank.

## Credits

* [MSDF Text Rendering](https://github.com/Chlumsky/msdf-atlas-gen) by Viktor Chlumský
* [Kubelka-Munk Color Blending](https://github.com/rvanwijnen/spectral.js) by Ronald van Wijnen
