// SPDX-License-Identifier: GPL-3.0-or-later
// Exercise the production custom picker; never bypass selection through Controller.
async function choosePreset(page, name) {
  await page.getByRole('combobox', { name: '当前使用预设', exact: true }).click();
  await page.getByRole('listbox', { name: '预设选项', exact: true }).getByRole('option', { name, exact: true }).click();
}
module.exports = { choosePreset };
