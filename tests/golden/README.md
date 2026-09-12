# Golden traces

The Phase 0 baseline is an empty stationary world: seed 42, 1000 steps, and 1001
state rows including step zero. It was created deliberately from the recorder.
Tests compare both fresh recording and replay against the checked-in CSV. Normal
verification never modifies this directory.

Trace entries are zero-based input changes applied before that indexed step.
Input holds until the next entry; steps before the first entry use idle input.
The `steps` field preserves a recording's duration even when its final input does
not change. CSV time is integer step index multiplied by the fixed 1/120 s step.
CSV uses JavaScript's round-trip numeric representation and LF line endings.

To propose a new baseline, record into a new scratch directory, inspect the numeric
diff, and explicitly report the intended behaviour change before replacing a
golden. The recording and replay commands refuse to overwrite an existing file.
