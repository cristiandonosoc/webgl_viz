# Packet Dapper Viz

Simple WebGL visualizer for Packet Dapper output format.
(In a nutshell: a big graph)

## Objectives

- Browser: Should be able to run seamlessly on all (important) browsers
- High performant: Should be able to handle 1M+ points seamlessly

## Rationale

For this, I decided to try to offload all graphics/positioning processing
to the GPU, and merely correctly index the points for quick lookup on the browser side

## "Compiling"

In this insane world of javascript "build systems", I am *appaled* but how hard
is to have simple functionalily commonplace in the 80s.
The closest I could have to a simple "make + includes" is to use TypeScript with webpack and ts-loader.

So check this out. Something that would only be a one liner with gcc:
(All installs are assumed global, but "don't do this, yadda yadda")

1. Install Node.js and ensure npm is present
2. Install dependencies (typescript, webpack, ts-loader, sass, etc)
  - npm install -g typescript ts-loader webpack node-sass css-loader sass-loader
    extract-text-webpack-plugin
3. run webpack
