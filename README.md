# Snowball

v0.1.9

## Context

This is a custom, hand-rolled JavaScript and WebGL engine created by [remnynt](https://vibes.art/).

It was started to enable [Proscenium](https://www.artblocks.io/collections/curated/projects/0x99a9b7c1116f9ceeb1652de04d5969cce509b069/486), my work released on Art Blocks' Curated. It's intended to be an object-oriented snowball of tools that rolls bigger and better over time, as I create new art and experiences.

It's presented as is, unlicensed, and open-source, so that folks can see how I build, think, and evolve in my practice. It's not suited for anyone really, outside of myself, because it follows my own idiosyncratic methods with a healthy disregard for best practices and the opinions of others. That being said, you're welcome to use it freely in any way you see fit.

It is a self-sufficient zero-dependency engine - no package manager or development tooling outside of what I've taken the time to build myself. It's the (nascent) Battlestar Galactica of JavaScript engines because it doesn't run arbitrary code outside of what you see here; it's un-networked, making it safe for folks who interact with cryptocurrency or other sensitive materials on the same machine. These properties also make it easier to store the engine on blockchains, like Ethereum, since there's no set of attributions, licenses, or dependencies to wrangle. I've made a small exception for vetted libraries with permissable licenses, found in the external directory.

The code for specific projects and artworks built with this engine, like Proscenium, will be released in separate repositories and may use a different license or have access restrictions.

## Development

1. From within the top level directory, select a project by creating a symlink:
```
ln -f -s projects/my_project_name/index.html index.html
```

2. Once a symlink has been created, you can serve the project (may need to use `python3`):
```
python -m http.server
```

3. To run and debug, navigate your browser to:
```
localhost:8000
```

## Blank Canvas

By default, the engine serves a simple example, found in projects/blank.
