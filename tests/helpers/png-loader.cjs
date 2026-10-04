// Copyright (C) 2026 SheepSheepLab
// SPDX-License-Identifier: GPL-3.0-or-later
// Match webpack's asset/inline data URL for the unmodified PNG in Node tests.
const fs = require('node:fs');
require.extensions['.png'] = (module, filename) => {
  module.exports = 'data:image/png;base64,' + fs.readFileSync(filename).toString('base64');
};
