# Repository lineage and publication notes

Jumper Agent is maintained at
[AugustSama-GEEKDOM/jumper-agent](https://github.com/AugustSama-GEEKDOM/jumper-agent) as a
feature branch derived from [KingKongRobotics/jumper](https://github.com/KingKongRobotics/jumper).
The branch retains the training, simulator, and controller foundation and adds the Tiaotiao web
application, simulator display streaming, and local action integration.

## Source and component boundaries

- The training framework and much of the project structure originate in the upstream Jumper
  repository. Upstream documentation remains relevant to the inherited Train and Deploy paths.
- The browser UI and screen-cast workflow are maintained in this branch under web/tiaotiao and
  assets/jumper/tools.
- Appearance and scene generation remain in the independent
  [jumper-design repository](https://github.com/KingKongRobotics/jumper-design); it is not
  included as a submodule.
- The example .app under out/bundle_example is versioned project content. A generated deployment
  bundle may contain different policies and must be reviewed separately before distribution.

## Before making a new public release

Review the files and history that will be distributed, then verify the applicable rights and
notices for robot model assets, imported motion clips, example policies, screenshots, and other
media. Keep private credentials, browser profiles, local logs, checkpoints, and personal runtime
configuration out of the repository and source archives. Public environment templates must leave
the AI endpoint and model unset and contain no real credentials.

The root package-project.ps1 script excludes local environment files and runtime state while
preserving source and the example app. Inspect its resulting archive. Read [LICENSE](../LICENSE)
and [NOTICE](../NOTICE) before making claims about redistribution.

## Validation and scope

The repository's automated checks cover framework contracts, selected model and simulator
behavior, browser-host builds, and documentation layout. A passing suite is not evidence of
physical robot operation, a provider's uptime, or the quality of every trained policy. Record
those results separately when they are tested.
