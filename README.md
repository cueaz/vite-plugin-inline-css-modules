# vite-plugin-inline-css-modules

[![npm](https://img.shields.io/npm/v/@cueaz/vite-plugin-inline-css-modules.svg)](https://www.npmjs.com/package/@cueaz/vite-plugin-inline-css-modules)
[![Code style: Prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://github.com/prettier/prettier)

> [!NOTE]
> This package is a fork of [bluskript/vite-plugin-inline-css-modules](https://github.com/bluskript/vite-plugin-inline-css-modules) with a few incompatible changes.
>
> - Explicit tag function name for preprocessor
> - Runtime error on accessing undefined class names

> Write CSS modules without leaving your javascript!

- Zero Runtime
- Contains full feature set of CSS modules (Includes PostCSS if you use that!)
  - Supports `@apply` and others!
  - Scopes your CSS locally to your component!
- Supports ANY framework

### Usage

```sh
pnpm add -D @cueaz/vite-plugin-inline-css-modules
```

vite.config.ts

```ts
import inlineCssModules from '@cueaz/vite-plugin-inline-css-modules';

export default {
  plugins: [inlineCssModules()],
};
```

src/env.d.ts

```ts
/// <reference types="@cueaz/vite-plugin-inline-css-modules" />
```

src/Root.tsx

```ts
// use sass`` scss`` less`` styl`` for preprocessors
const classes = css`
  .root {
    background-color: #1f1;
    @apply rounded-md;
  }
`

// accessing undefined classes.abc will throw a runtime error
export const Root = () => <div class={classes.root}>Hello world</div>
```

### Why is this useful?

This was originally written for writing styles in SolidJS. I came from Vue, which already contained a special `<style scoped>` tag, and I wanted something just as easy to use as that. If you are using a framework that does not support writing scoped styles natively, this is for you!

### Why not one of the hundreds of existing CSS-in-JS solutions?

Every single CSS-in-JS solution i've seen suffers from the same problem: it can't integrate with existing tooling.
This plugin simply generates a CSS module using the contents of the string. This allows it to integrate with PostCSS
and things like Tailwind or UnoCSS with ease.

In addition, a lot of solutions also have an implicit bundling cost. This differs in that it is completely based on CSS modules.

### Caveats

- This plugin does not support string interpolation. It may seem that way from the use of template strings, but all this plugin really does is move the contents of the string template **into a real CSS module**, meaning string interpolation can't work.

- You can't manipulate the classes variables as normal JS variables.

  Why? because at compile time, this plugin transforms:

  ```ts
  const classes = css``;
  ```

  into:

  ```ts
  import classes from './[basename]/classes.inline.module.css.wrapper';
  ```

### Plugin Options

None

### Help

- I'm getting an error like `inlineCss is not defined`
  - This is probably because you didn't set the tag name correctly in config.
    This plugin might be deleting your import of `inlineCss` from this plugin, so please check to make sure that the `tagName` option is set correctly.
