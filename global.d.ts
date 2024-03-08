type CSSModuleClasses = { readonly [key: string]: string };

declare function css(strings: TemplateStringsArray): CSSModuleClasses;
declare function sass(strings: TemplateStringsArray): CSSModuleClasses;
declare function scss(strings: TemplateStringsArray): CSSModuleClasses;
declare function less(strings: TemplateStringsArray): CSSModuleClasses;
declare function styl(strings: TemplateStringsArray): CSSModuleClasses;
