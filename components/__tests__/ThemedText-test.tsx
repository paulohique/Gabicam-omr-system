import * as React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';

import { ThemedText } from '../ThemedText';

it(`renders correctly`, () => {
  let testRenderer!: renderer.ReactTestRenderer;
  act(() => {
    testRenderer = renderer.create(<ThemedText>Snapshot test!</ThemedText>);
  });
  const text = testRenderer.root.findByType(Text as never);

  expect(text.props.children).toBe('Snapshot test!');
  expect(text.props.style).toEqual(expect.arrayContaining([
    expect.objectContaining({ fontSize: 16, lineHeight: 24 }),
  ]));
});
