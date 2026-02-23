# warframe-tracker
Tool to assist with tracking warframe arcanes and prime items.

### What it does?
1. It fetches as much information as possible from the public available [API](https://raw.githubusercontent.com/WFCD/warframe-items/master/data/json/Arcanes.json).
2. Allows user to input how many copies of the arcanes they own, and displays how many are still remaining to obtain a max rank one. It also stores this data locally in a `owned.json` file, generated at `../data`.
3. Under the same data directory, it allows for a custom `custom-drops.json`, for adding/correcting information (i.e. new arcanes, missing API information, etc.)
4. Has the following filters for the arcanes list:

    - By type:
        - Warframe
        - Primary
        - Secondary
        - Melee
        - Operator
        - Amp
        - Kitgun
        - Zaw

    - And then, by source:
        - Arbitrations
        - Ascension
        - Cavia
        - Conjunction Survival
        - Duviri
        - Eidolons
        - Isolation Vault
        - La Cathédrale
        - Mirror Defense
        - Ostron
        - Plague Star
        - The Quills
        - Steel Path (Acolytes)
        - The Hex (Any Höllvania content)
        - Zariman

5. Display extra arcane data regarding release date and drop location.

6. Prime items have the following filters:

    - By type:
        - Warframe
        - Primary
        - Secondary
        - Melee
        - Arch-gun
        - Arch-melee
        - Sentinels
        - Archwings
    - By status:
        - Available
        - Vaulted
        - Founders
        - Specials

Note: No resurgence tag implemented, because I could not find a readily available endpoint for Varzia's stock data.

This repository provides example files to illustrate how you can populate the `.json`  files.

Note: The unninstaller does **not** remove the user data (i.e. the `../data` directory and its contents)

### Language Support
It supports two languages: **Portuguese-Brazil** and **English**. This can be expanded in the future with additions to the `index.html` buttons/images and through new mappings and locales files. 