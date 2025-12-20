# warframe-tracker
Tool to assist with tracking warframe arcanes.

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
        - Zawz

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

This directory 

Note: The unninstaller does **not** remove the user data (i.e. the `../data` directory and its contents)


