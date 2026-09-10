"""Builds the ASCII architecture diagram on a character grid.

Hand-aligned ASCII goes wrong the moment anyone edits a label, so the diagram
is composited onto a grid instead: boxes are placed by column and every
connector is drawn at a computed centre. Edit the text below and re-run.

    python3 scripts/generateArchitectureDiagram.py > docs/agent-architecture.txt

The prose here is deliberately fuller than `src/server/domain/pipeline.ts`,
which drives the UI — a slide has room to say why an agent is built the way it
is. Keep the two in step by hand when the pipeline changes.
"""

W = 92
grid = []

def row(n=1):
    for _ in range(n):
        grid.append([" "] * W)

def put(r, c, text):
    for i, ch in enumerate(text):
        grid[r][c + i] = ch

def box(col, width, lines, rule_after=None):
    """Draws a box at `col`. `rule_after` inserts a --- separator after that line index."""
    start = len(grid)
    body = []
    for i, line in enumerate(lines):
        body.append(line)
        if rule_after is not None and i == rule_after:
            body.append(None)          # None renders as an internal rule
    row(len(body) + 2)
    put(start, col, "+" + "-" * (width - 2) + "+")
    for i, line in enumerate(body):
        r = start + 1 + i
        if line is None:
            put(r, col, "+" + "-" * (width - 2) + "+")
        else:
            put(r, col, "|" + line.ljust(width - 2) + "|")
    put(start + len(body) + 1, col, "+" + "-" * (width - 2) + "+")
    return start

def stem(col, n=1, arrow=False):
    start = len(grid)
    row(n)
    for i in range(n):
        put(start + i, col, "|")
    if arrow:
        put(start + n - 1, col, "v")

def label(col, text):
    start = len(grid)
    row(1)
    put(start, col, text)

# ---- geometry -------------------------------------------------------------
CENTRE = 38          # the spine every single-column box hangs from
MAIN_W = 46          # width of a full-width box
MAIN_C = CENTRE - MAIN_W // 2          # 15
LEFT_W = RIGHT_W = 32
LEFT_C, RIGHT_C = 3, 43
LEFT_CENTRE = LEFT_C + LEFT_W // 2     # 19
RIGHT_CENTRE = RIGHT_C + RIGHT_W // 2  # 59

# ---- top ------------------------------------------------------------------
box(MAIN_C, MAIN_W, [
    "  AUDIT TYPE",
    "",
    "  AML  /  Conduct  /  Client Assets  /",
    "  Technology  /  People",
], rule_after=0)
stem(CENTRE, 2, arrow=True)

box(MAIN_C, MAIN_W, [
    "  RISK INTAKE",
    "",
    "  Fixed checkbox options, taken from the",
    "  framework that governs that audit.",
    "  Answering them IS the risk assessment.",
], rule_after=0)

# ---- fork -----------------------------------------------------------------
stem(CENTRE, 1)
start = len(grid); row(1)
put(start, LEFT_CENTRE, "+" + "-" * (RIGHT_CENTRE - LEFT_CENTRE - 1) + "+")
put(start, CENTRE, "+")
start = len(grid); row(1)
put(start, LEFT_CENTRE, "v")
put(start, RIGHT_CENTRE, "v")

# ---- the parallel pair ----------------------------------------------------
top = len(grid)
left = [
    "  1. RISK AGENT",
    "",
    "  NO TOOLS.",
    "  Judgement about the firm in",
    "  front of it, not research.",
    "",
    "  Cheapest agent, so it runs",
    "  alongside the expensive one.",
]
right = [
    "  2. OBLIGATIONS AGENT",
    "",
    "  WEB SEARCH - the only",
    "  agent with network access.",
    "",
    "  Cites a catalogue handle,",
    "  so a fake URL cannot be",
    "  expressed at all.",
]
h = max(len(left), len(right)) + 3
row(h)
def draw_at(top, col, width, lines):
    put(top, col, "+" + "-" * (width - 2) + "+")
    r = top + 1
    put(r, col, "|" + lines[0].ljust(width - 2) + "|"); r += 1
    put(r, col, "+" + "-" * (width - 2) + "+"); r += 1
    for line in lines[1:]:
        put(r, col, "|" + line.ljust(width - 2) + "|"); r += 1
    put(r, col, "+" + "-" * (width - 2) + "+")
draw_at(top, LEFT_C, LEFT_W, left)
draw_at(top, RIGHT_C, RIGHT_W, right)

# ---- join -----------------------------------------------------------------
# The two stems carry an annotation each, so the reader sees what actually
# flows down the line rather than inferring it from the boxes.
annotations = [
    ("", ""),
    ("risk factors", "obligations"),
    ("tagged by dimension,", "each with a source URL"),
    ("traced to your answers", "and a coverage theme"),
    ("", ""),
]
for left_text, right_text in annotations:
    start = len(grid); row(1)
    put(start, LEFT_CENTRE, "|")
    put(start, RIGHT_CENTRE, "|")
    if left_text:
        put(start, LEFT_CENTRE + 2, left_text)
    if right_text:
        put(start, RIGHT_CENTRE + 2, right_text)
start = len(grid); row(1)
put(start, LEFT_CENTRE, "+" + "-" * (RIGHT_CENTRE - LEFT_CENTRE - 1) + "+")
put(start, CENTRE, "+")
stem(CENTRE, 1, arrow=True)

# ---- scope ----------------------------------------------------------------
box(MAIN_C, MAIN_W, [
    "  3. SCOPE AGENT",
    "",
    "  Merges both into proposed control areas.",
    "",
    "  An area that cannot cite BOTH a risk",
    "  factor AND an obligation is dropped.",
], rule_after=0)
stem(CENTRE, 2, arrow=True)

# ---- the gate -------------------------------------------------------------
GATE_W = 54
GATE_C = CENTRE - GATE_W // 2
start = len(grid)
gate = [
    "  >>>  YOU APPROVE THE SCOPE  <<<",
    "",
    "  Keep or drop each proposed area.",
    "  Nothing further is drafted until you decide.",
]
row(len(gate) + 3)
put(start, GATE_C, "#" * GATE_W)
put(start + 1, GATE_C, "#" + " " * (GATE_W - 2) + "#")
for i, line in enumerate(gate):
    put(start + 2 + i, GATE_C, "#" + line.ljust(GATE_W - 2) + "#")
put(start + 2 + len(gate), GATE_C, "#" * GATE_W)
stem(CENTRE, 2, arrow=True)

# ---- evidence -------------------------------------------------------------
box(MAIN_C, MAIN_W, [
    "  4. EVIDENCE AGENT",
    "",
    "  Writes testing steps for APPROVED areas",
    "  only. Untick half the scope, pay half.",
    "",
    "  A step with no named evidence is dropped.",
], rule_after=0)
stem(CENTRE, 2, arrow=True)

box(MAIN_C, MAIN_W, [
    "  AUDIT PROGRAMME",
    "",
    "  Every stage persisted: what it produced,",
    "  what it cost, what it dropped.",
], rule_after=0)

out = "\n".join("".join(r).rstrip() for r in grid)
print(out)
