# SPE-Playground

## by @ReidCarlberg - https://www.linkedin.com/in/reidcarlberg/

**Important: although I am a Microsoft employee, this is not officially produced or maintained and you should only use it at your own risk.**

**Pull requests welcome.**

### Overview

- Demo playground app for SharePoint Embedded.  Learn more at https://aka.ms/start-spe.
- Designed to run in your local environment.
- You must have SharePoint Embedded completely configured in order to use this.  Learn more at https://learn.microsoft.com/en-us/training/modules/sharepoint-embedded-setup/5-exercise-setup-configure-sharepoint-embedded.
- You can configure via PowerShell or VS Code Plugin, but the settings must be in .env file.
- Works with both trial container types and standard container types.
- Official Microsoft Graph API documentation is here - https://learn.microsoft.com/en-us/graph/api/overview?view=graph-rest-1.0. 

### Getting Started: 

- Clone this repo into your local environment.
- Use ".env_template" to create your own ".env" file using SPE configuration values.
- You must have a certificate configured, as indicated in the instructions.
- Use NPM install to install all of your dependdencies.
- Use NPM start to get the whole thing up and running.
- The first time your run this, you'll need to authenticate with the "SharePoint Only" method and the register the container type in your tenant.

### Notes:

- This app assumes you're running in global admin mode all the time.
- If you authenticate in app-only authentication mode, lots of things won't work the way they do in delegated mode -- search, collab, etc.
- There are sample docs in the aptly named "sample-docs" directory.
- This isn't designed to show best practices etc., just shows different aspects in action.


