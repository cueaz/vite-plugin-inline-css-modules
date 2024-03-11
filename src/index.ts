import { posix as path } from 'node:path';
import type { Plugin, ViteDevServer } from 'vite';
import MagicString from 'magic-string';

const extensions = ['css', 'sass', 'scss', 'less', 'styl'] as const;
const matchInlineCssModules =
  /(?:const|var|let)\s*(\w+)(?:\s*:.*)?\s*=\s*(\w+)\s*`([\s\S]*?)`/gm;
const matchScripts = /\.(j|t)sx?$/;

const virtualExtCss = (ext: string) => `.inline.module.${ext}`;
const virtualExtWrapper = (ext: string) => virtualExtCss(ext) + '.wrapper';

const inlineCssModules = (): Plugin => {
  let server: ViteDevServer;

  const invalidateModule = (absoluteId: string) => {
    const { moduleGraph } = server;
    const modules = moduleGraph.getModulesByFile(absoluteId);

    if (modules) {
      for (const module of modules) {
        moduleGraph.invalidateModule(module);

        module.lastHMRTimestamp =
          module.lastInvalidationTimestamp || Date.now();
      }
    }
  };

  const fileMap = new Map<string, string>();

  return {
    name: 'inline-css-modules',
    enforce: 'pre',

    configureServer(devServer) {
      server = devServer;
    },

    resolveId(source, importer) {
      if (!importer) {
        return;
      }

      const id = path.join(path.dirname(importer), source);
      const [validId] = id.split('?');

      if (
        extensions.some(
          (ext) =>
            validId.endsWith(virtualExtCss(ext)) ||
            validId.endsWith(virtualExtWrapper(ext)),
        )
      ) {
        return id;
      }
    },

    load(id) {
      const [validId] = id.split('?');

      if (fileMap.has(validId)) {
        return fileMap.get(validId);
      }
    },

    transform(code, id) {
      const [validId] = id.split('?');

      if (!matchScripts.test(validId)) {
        return;
      }

      const { dir, base } = path.parse(validId);

      const src = new MagicString(code);

      src.replaceAll(matchInlineCssModules, (substring, name, tag, css) => {
        if (!extensions.includes(tag)) {
          return substring;
        }

        const baseSuffix = base + '-' + name;
        const validIdCss = baseSuffix + virtualExtCss(tag);
        const validIdWrapper = baseSuffix + virtualExtWrapper(tag);

        const absoluteIdCss = path.join(dir, validIdCss);
        const absoluteIdWrapper = path.join(dir, validIdWrapper);

        const changed =
          fileMap.has(absoluteIdCss) && fileMap.get(absoluteIdCss) !== css;

        fileMap.set(absoluteIdCss, css);
        fileMap.set(
          absoluteIdWrapper,
          `
            import styles from './${validIdCss}';
            export default new Proxy(styles, {
              get(target, prop) {
                if (prop in target) {
                  return target[prop];
                } else {
                  throw new Error('Unknown class: ' + prop);
                }
              }
            });
          `,
        );

        if (server && changed) {
          invalidateModule(absoluteIdCss);
          invalidateModule(absoluteIdWrapper);
        }

        return `import ${name} from './${validIdWrapper}';\n`;
      });

      return {
        code: src.toString(),
        map: src.generateMap({ hires: true }),
      };
    },
  };
};

export default inlineCssModules;
