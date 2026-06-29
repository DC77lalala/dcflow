import { describe, expect, it } from 'vitest';
import { renderTemplate } from '../../src/core/templateRenderer.js';

describe('template renderer', () => {
  it('replaces template variables with string values', () => {
    const output = renderTemplate('Project: {{projectName}}\nFlow: {{flowName}}', {
      projectName: 'demo',
      flowName: 'harness',
    });

    expect(output).toBe('Project: demo\nFlow: harness');
  });

  it('leaves unknown variables empty instead of leaking placeholders', () => {
    const output = renderTemplate('Project: {{projectName}}\nOwner: {{owner}}', {
      projectName: 'demo',
    });

    expect(output).toBe('Project: demo\nOwner: ');
  });
});
