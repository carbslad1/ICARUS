const boundaryMessage = 'sim/ must be renderer-free, deterministic, and Node-runnable.';
const restrictedModules = /(?:^|\/)(?:render|input|audio|harness)(?:\/|$)|^pixi\.js(?:\/|$)/;
const brandedNames = new Set(['Metres', 'MetresPerSec', 'MetresPerSec2', 'Seconds', 'Radians', 'WorldPos', 'LocalPos']);
const rule = (message, create) => ({
  meta: { type: 'problem', schema: [], messages: { forbidden: message } },
  create,
});

export default {
  rules: {
    'sim-boundary': rule(boundaryMessage, (context) => {
      function check(node) {
        if (typeof node.value === 'string' && restrictedModules.test(node.value)) {
          context.report({ node, messageId: 'forbidden' });
        }
      }
      return {
        ImportDeclaration: (node) => check(node.source),
        ExportNamedDeclaration: (node) => { if (node.source) check(node.source); },
        ExportAllDeclaration: (node) => check(node.source),
        ImportExpression: (node) => check(node.source),
        CallExpression: (node) => {
          if (node.callee.type === 'Identifier' && node.callee.name === 'require' && node.arguments[0]) check(node.arguments[0]);
        },
      };
    }),
    'no-unit-casts': rule('Construct branded units and positions only in sim/units.ts.', (context) => {
      if (context.filename.endsWith('/src/sim/units.ts')) return {};
      function check(node) {
        const annotation = node.typeAnnotation;
        if (annotation.type === 'TSTypeReference' && annotation.typeName.type === 'Identifier' && brandedNames.has(annotation.typeName.name)) {
          context.report({ node, messageId: 'forbidden' });
        }
      }
      return { TSAsExpression: check, TSTypeAssertion: check };
    }),
    'no-conditional-gameplay': rule('Platform, debug, and headless flags belong upstream of PlayerIntent.', (context) => ({
      Identifier(node) {
        if (['headless', 'debug', 'platform', 'window', 'document', 'navigator'].includes(node.name)) {
          context.report({ node, messageId: 'forbidden' });
        }
      },
    })),
    'no-raw-colours': rule('Use a named token from render/palette.ts.', (context) => ({
      Literal(node) {
        const raw = context.sourceCode.getText(node);
        if (/^0x[\da-f]+$/i.test(raw) || (typeof node.value === 'string' && /#[\da-f]{3,8}\b|\b(?:rgba?|hsla?|oklch|oklab|color)\s*\(/i.test(node.value))) {
          context.report({ node, messageId: 'forbidden' });
        }
      },
      TemplateElement(node) {
        if (/#[\da-f]{3,8}\b|\b(?:rgba?|hsla?|oklch|oklab|color)\s*\(/i.test(node.value.raw)) {
          context.report({ node, messageId: 'forbidden' });
        }
      },
    })),
  },
};
