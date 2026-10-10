// Logic tool pieces (editor Logic tab). Editors see them; players never do. Settings live in state.
export const vol = {
  tags: ['ed-vol'], visibleTo: 'editors', castShadow: false, receiveShadow: false,
  physics: { body: 'static', trigger: true }, behavior: 'scripts/ed-vol.js',
};
export const node = { tags: ['ed-node'], visibleTo: 'editors', castShadow: false, receiveShadow: false };
