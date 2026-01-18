---
id: rd-u22.1
status: closed
deps: []
links: []
created: 2026-01-07T07:59:10.491884686-08:00
type: task
priority: 0
parent: rd-u22
---
# Add LICENSE file

Add MIT LICENSE file to repository root.

**Context:** package.json claims MIT license but no LICENSE file exists. This is a legal requirement for OSS.

**Note:** Project created December 2025. Use `2025` as copyright year.

**Acceptance Criteria:**
- [ ] LICENSE file exists at repo root
- [ ] Contains MIT license text with correct copyright holder (Christian Catalan, 2025)

**Implementation:**
```bash
cat > LICENSE << 'EOF'
MIT License

Copyright (c) 2025 Christian Catalan

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
EOF
```

**Reference:** plans/RELEASE-READINESS-v0.1.0.md §1


