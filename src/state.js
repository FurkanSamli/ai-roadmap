// Shared, mutable app state and the action table.
// Actions are called through `actions` so UI modules do not import each other in a cycle;
// main.js fills them in at startup.

export const state = {
  view: null,   // entity whose roadmap is on screen (model.core = home)
  open: null,   // entity shown in the detail drawer, or null
};

export const actions = {
  openTopic: () => {},   // openTopic(entity): show it in the drawer (keeps the current roadmap)
  goTo: () => {},        // goTo(entity, topic?): show entity's roadmap, optionally with a topic open
  closeDrawer: () => {},
  rerender: () => {},    // redraw the roadmap and the open drawer (after a restore or reset)
};
