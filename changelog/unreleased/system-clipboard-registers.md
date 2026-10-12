---
title: System clipboard registers
type: feature
authors:
  - mavam
created: 2026-10-12T16:12:14.039925Z
---

Prefix a command with `"+` or `"*` to use the system clipboard: `"+yy`,
`"+dd`, or `"+y` on a Visual selection copy to it, and `"+p` puts what it
holds in NORMAL mode. Your own copies keep their line or block shape, and text
from elsewhere that ends in a line break puts as whole lines. Plain `p` keeps
using the internal register.
