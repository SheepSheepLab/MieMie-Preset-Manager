// The migration parent is inert while an owned child is open.
// Assertions and actions always address the interactive surface, never the underlay.
module.exports.activeMigrationDialog=page=>page.locator('dialog.mm-migration-dialog[open]:not([inert]):not(.mm-migration-preview)');
