import { posix as path } from 'node:path';
import type { Plugin, ViteDevServer } from 'vite';
import MagicString from 'magic-string';

const extensions = ['css', 'sass', 'scss', 'less', 'styl'] as const;
const matchInlineCssModules =
  /(?:const|var|let)\s*(\w+)(?:\s*:.*)?\s*=\s*(\w+)\s*`([\s\S]*?)`/gm;
const matchScripts = /\.(j|t)sx?$/;

const pluginName = 'inline-css-modules';

const virtualUtilsId = 'virtual:' + pluginName;
const resolveUtilsId = (id: string) => '\0' + id;

const virtualExtCss = (ext: string) => `.inline.module.${ext}`;
const virtualExtWrapper = (ext: string) => virtualExtCss(ext) + '.wrapper';

const splitQuery = (id: string) => id.split('?');

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

  const resolvedIdMap = new Map<string, string>();

  resolvedIdMap.set(
    resolveUtilsId(virtualUtilsId),
    `
      export const wrap = (styles) => new Proxy(styles, {
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

  return {
    name: pluginName,
    enforce: 'pre',

    configureServer(devServer) {
      server = devServer;
    },

    resolveId(source, importer) {
      if (!importer) {
        return;
      }

      const [validSource] = splitQuery(source);

      if (validSource === virtualUtilsId) {
        return resolveUtilsId(source);
      }

      const id = path.join(path.dirname(importer), source);
      const [validId] = splitQuery(id);

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
      const [validId] = splitQuery(id);

      if (resolvedIdMap.has(validId)) {
        return resolvedIdMap.get(validId);
      }
    },

    transform(code, id) {
      const [validId] = splitQuery(id);

      if (!matchScripts.test(validId)) {
        return;
      }

      const base = path.basename(validId);

      const src = new MagicString(code);

      src.replaceAll(matchInlineCssModules, (substring, name, tag, css) => {
        if (!extensions.includes(tag)) {
          return substring;
        }

        const baseCss = name + virtualExtCss(tag);
        const baseWrapper = name + virtualExtWrapper(tag);

        const validIdCss = path.join(validId, baseCss);
        const validIdWrapper = path.join(validId, baseWrapper);

        const changed =
          resolvedIdMap.has(validIdCss) &&
          resolvedIdMap.get(validIdCss) !== css;

        resolvedIdMap.set(validIdCss, css);
        resolvedIdMap.set(
          validIdWrapper,
          `
            import { wrap } from '${virtualUtilsId}';
            import styles from './${baseCss}';
            export default wrap(styles);
          `,
        );

        if (server && changed) {
          invalidateModule(validIdCss);
          invalidateModule(validIdWrapper);
        }

        return `import ${name} from './${path.join(base, baseWrapper)}';\n`;
      });

      return {
        code: src.toString(),
        map: src.generateMap({ hires: true }),
      };
    },
  };
};

export default inlineCssModules;
