# AI log

Every time you give an AI tool a significant prompt, add an entry. Three lines each.
"Nothing was wrong" is allowed, but it is rarely true. Your instructor will read this.

## Build 2

### Prompt 1: Build 2 prompt (docs/build-2.md)
- **What I asked:** Implement Build 2 sorting, event publishing/search, and acceptance-criteria tests.
- **What came back:** Added a stable merge sort, event publication and summary helpers, pure search/filter/sort functions, a Node test suite, and the `npm test` script. I also filled in the three S04 acceptance criteria.
- **What was wrong (or "nothing"):** During review, I found and corrected escaped newline/regular-expression mistakes and tightened validation for impossible ISO calendar dates. The test suite still needs to be run with Node 22.13+ before this build can be considered verified.

### Prompt 2:
- **What I asked:**
- **What came back:**
- **What was wrong (or "nothing"):**


## Build 3

### Prompt 1: Build 3 architecture, state machine, and server
- **What I asked:** Implement the Build 3 architecture diagrams, booking state machine, HTTP router/server, static file serving, and tests.
- **What came back:** Added architecture documentation, explicit booking transitions, a small parameterized router, a Node HTTP server with health endpoint and static-file handling, configuration, and tests.
- **What was wrong (or "nothing"):** The HTTP JSON parser and error response paths need verification by running the full test suite on Node 22.13+. No external packages were added.
