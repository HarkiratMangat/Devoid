Chips are mono `micro` text in a 20px pill. They report an instrument reading; they are never buttons.

- `.auto` (`cyan-bg` / `cyan-ink`, weight 500) means the engine is deciding. A control reads `auto · <value>` until the person deliberately takes it over.
- `.val` is the same slot after a takeover: an outlined `score-2` box with the chosen value.
- `.wipetag` labels the two halves of the wipe, on `bench`.
- The consumer supplies the value text. Do not show an engine flag name in a chip.
