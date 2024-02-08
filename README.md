

# Workflows SCIM Relay

This is an implementation of a SCIM 2.0 server using the Okta
Workflows product, with help from a Cloudflare Function.


## Overview

The software in this project will enable you to configure a SCIM 2.0
client to any Okta org, allowing you to connect an external user
source to Okta via SCIM 2.0.

That said, please be aware of the following strengths, weaknesses, and
known gaps in this project:


### Strengths

-   Enables you to provision users to an Okta org via SCIM 2.0
-   Doesn't require special programming knowledge to host, run, or modify


### Weaknesses

-   Not tested in production yet
-   Most requests take over 1000 milliseconds to complete


### Known gaps

-   Only tested against Okta's SCIM 2.0 client implementation
-   Does not yet support importing more than 200 groups
-   Only implements header based authentication
-   Only tested to support the `eq` filter on `/Users`


## IMPORTANT

This project is licensed under the terms of the Apache 2.0 license,
which is listed in full in the `LICENSE` file of this repository.

Please note that this means that this software is available **without
support** and **without warranty**:

> Disclaimer of Warranty. Unless required by applicable law or
> agreed to in writing, Licensor provides the Work (and each
> Contributor provides its Contributions) on an "AS IS" BASIS,
> WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
> implied, including, without limitation, any warranties or conditions
> of TITLE, NON-INFRINGEMENT, MERCHANTABILITY, or FITNESS FOR A
> PARTICULAR PURPOSE. You are solely responsible for determining the
> appropriateness of using or redistributing the Work and assume any
> risks associated with Your exercise of permissions under this License.

You are solely responsible for how you use this software. It is not
supported by either Okta or Cloudflare.


# Quickstart

If you are already familiar with Cloudflare Functions and Okta
Workflows, here is a high level overview of what you'll need to do
to get this project set up.

In-depth instructions are below. Open an issue in the
GitHub repository for this project with any questions.


## Prerequisites

You will need the following:

-   Two Okta orgs:
    1.  A "source" Okta Org, this is what will be sending SCIM 2.0 messages
    2.  A "target" Okta Org, this is what will be receiving SCIM 2.0
        messages
-   An account with Cloudflare
-   This git repository


## Quickstart steps

1.  Clone this repository to your local system
2.  On your "target" Okta Org:
    -   Add a custom profile attribute named `externalId` to the default
        Okta user profile.
        
        You can do this from the Okta Admin UI using: Directory > Profile
        Editor, then selecting the "User (default)" profile, then clicking
        the "Add Attribute" button, then naming the variable `externalId`.
    -   Import the `Workflows_SCIM_Relay.folder` file into Okta
        Workflows. This will create a folder named "SCIM".
    -   Configure the Okta connection to the "target" Okta Org in
        Workflows, so that the SCIM Server is able to access your target
        Okta org.
    -   Turn on all of the flows in the "SCIM" folder as well as the
        "HTTP Methods" and "Utilities" sub-folders.
    -   Open the "Periodically Update Resource Counts In the Metadata
        Table" Scheduled Flow and run it using the "Test" button. This
        will populate the counts of all users and groups, which is a key
        part of what makes the SCIM server work.
    -   Open the "SCIM Server" API Workflow (in the SCIM) folder, and
        copy the "Invoke URL" from the "API Endpoint Settings" of the
        "API Endpoint" card.
        -   Change the bearer token to something unique.
3.  Deploy the Cloudflare Functions code in this project to
    Cloudflare. This is a thin HTTP proxy that turns all HTTP requests
    into HTTP POST requests.
    -   Edit the `wrangler.toml` file in this repository. Set the value
        of the `WORKFLOW_URL` variable to the "Invoke URL" as per above.
    -   Install the `wrangler` command.
    -   Run `wrangler publish` to deploy the Cloudflare Function.
    -   Wrangler should give you a URL where the thin HTTP proxy has been
        deployed. Copy this URL, it should look like this:
        `https://workflows-scim-relay.example.workers.dev`
4.  On your "source" Okta Org:
    -   Use the URL for the thin HTTP proxy to configure your SCIM 2.0
        client in your "source" Okta Org. Don't forget to append
        `/scim/v2/` to the URL.
    -   Make sure to visit the "To App" part of the "Provisioning" tab
        and enable the features like "Create Users" and "Update User Attributes".


# How it works

The Workflows SCIM Relay uses Cloudflare to proxy all HTTP requests
made to it into Okta Workflow, which then converts those HTTP requests
into Okta API requests.

![img](./assets/overview.svg)

What follows is an example of what would happen if the "source" Okta Org were
to make a request for the first user in the "target" Okta Org via SCIM.

The following domains are used in this example:

-   `source.oktapreview.example` - the "source" Okta Org
-   `workflows-scim-relay.example.workers.dev` - the Couldflare Worker
    HTTP proxy
-   `target.workflows.oktapreview.example` - the domain used for Okta
    Workflows in the "target" Okta Org
-   `target.oktapreview.example` - the "target" Okta Org

Using the domains above, here is what would happen if the "source"
Okta Org were to make a request for the first user in the "target"
Okta Org via SCIM:

1.  An HTTP request from `source.oktapreview.example` would be made to
    `workflows-scim-relay.example.workers.dev`. If the `curl` command
    were to make this request, it would look like this:
    
        curl -H $AUTH "https://workflows-scim-relay.example.workers.dev/scim/v2/Users?startIndex=1&count=1"
2.  The Cloudflare Worker running at
    `workflows-scim-relay.example.workers.dev` would convert this HTTP GET
    request into a single HTTP POST containing JSON that represents the
    GET request as a JSON payload that conforms to the [Request](https://developer.mozilla.org/en-US/docs/Web/API/Request) and [URL](https://developer.mozilla.org/en-US/docs/Web/API/URL)
    objects of the "Fetch" Web API. Here is simplified version of what
    the HTTP GET request above looks like when it's serialized into JSON
    by the Cloudflare proxy:
    
        {
            "redirect": "manual",
            "url": "https://workflows-scim-relay.example.workers.dev/scim/v2/Users?startIndex=1&count=1",
            "method": "GET",
            "body": "",
            "headers": {
                "accept": "*/*",
                "accept-encoding": "gzip",
                "authorization": "Bearer abcd1234efgh",
                "connection": "Keep-Alive",
                "host": "workflows-scim-relay.example.workers.dev",
                "user-agent": "curl/7.88.1",
                "x-forwarded-proto": "https",
                "x-real-ip": "10.115.114.99"
            },
            "whatwgURL": {
                "search": "?startIndex=1&count=1",
                "pathname": "/scim/v2/Users",
                "hostname": "workflows-scim-relay.example.workers.dev",
                "host": "workflows-scim-relay.example.workers.dev",
                "protocol": "https:",
                "href": "https://workflows-scim-relay.example.workers.dev/scim/v2/Users?startIndex=1&count=1",
                "origin": "https://workflows-scim-relay.example.workers.dev",
                "searchParams": {
                    "startIndex": "1",
                    "count": "1"
                }
            }
        }
    
    If the `curl` command were to make
    this request, it would look like this:
    
        curl -X POST -H "Content-Type: application/json" \
             -d '{"redirect":"manual","url":"https://workflows-scim-relay.example.workers.dev/scim/v2/Users?startIndex=1&count=1","method":"GET","body":"","headers":{"accept":"*/*","accept-encoding":"gzip","authorization":"Bearer abcd1234efgh","connection":"Keep-Alive","host":"workflows-scim-relay.example.workers.dev","user-agent":"curl/7.88.1","x-forwarded-proto":"https","x-real-ip":"10.115.114.99"},"whatwgURL":{"search":"?startIndex=1&count=1","pathname":"/scim/v2/Users","hostname":"workflows-scim-relay.example.workers.dev","host":"workflows-scim-relay.example.workers.dev","protocol":"https:","href":"https://workflows-scim-relay.example.workers.dev/scim/v2/Users?startIndex=1&count=1","origin":"https://workflows-scim-relay.example.workers.dev","searchParams":{"startIndex":"1","count":"1"}}}' \
             https://target.workflows.oktapreview.example/api/flo/ab1c23de4fg567h8i9/invoke
3.  The Okta Workflow listening to the API Endpoint at
    `https://target.workflows.oktapreview.example/api/flo/ab1c23de4fg567h8i9/invoke`
    would process the request, and return an appropriate response using HTTP.
4.  The Cloudflare proxy would take the response from the Okta Workflow
    and send it to `source.oktapreview.example`.


# Detailed setup instructions

In-depth instructions for setting up the Workflows SCIM Relay are below:


## Clone this repository to your machine

-   On macOS you can do this from a terminal by typing this command into
    your terminal:
    
        git clone https://github.com/jpf/workflows-scim-relay.git


## Setting up the "target" Okta org

The instructions below assume that you're starting from the Admin
Dashboard in your Okta org, do this by following the steps below:

-   Log in as an Admin user on your target org.
-   Enter the Admin Dashboard by clicking on the "Admin" button in the upper left.


### Add the "externalId" attribute to Universal Directory

The Workflows SCIM Proxy requires a custom attribute in Universal
Directory called "externalId" set it up by following the steps below:

-   Open the Admin Dashboard
-   In the left-hand navigation, click on "Directory" to expand the
    menu.
-   Click "Profile Editor".
-   Find the "User (default)" user type and click on it.
-   You should now see a "Profile Editor" screen.
-   Click on the "+ Add Attribute" button in the "Attributes" section.
-   Configure the Attribute as follows:
    -   Data type: string
    -   Display name: External ID
    -   Variable name: `externalId`
    -   Description: SCIM External ID used by the Workflows SCIM Relay
    -   Leave all of the other settings at their defaults.
    -   Click on the blue "Save" button.


### Setting up the Workflows

-   Open the Admin Dashboard
-   In the left-hand navigation, click on "Workflow" to expand the menu.
-   Click the "Workflows console" link.
-   In the new window that opens, click "Flows" in the top menu bar.
-   In the left hand navigation, to the right of the word "Folders" find
    the plus symbol that is in a circle and click it.
-   A "Create new folder" dialog should open, enter "SCIM" as the Folder
    name and click the "Save" button.
-   Click on the newly created "SCIM" folder.
-   Click the "Actions" drop down menu on the right and select "Import".
-   Find the copy of this git repository that you cloned to your
    machine, locate the "Workflows<sub>SCIM</sub><sub>Relay.folder</sub>" file and then drag
    it into the window that says "Drag and drop file here" or use the
    "Choose file from computer" link to select the file.
-   You should now see that the SCIM folder has two sub-folders:
    1.  HTTP Methods
    2.  Utilities
-   Add the Okta connection to Workflows
    After importing the SCIM Relay into Workflows, we need to add an
    Okta connection for the SCIM Relay to use. Follow the steps below to
    do that:
    -   Click the "Connections" link at the top of the Workflows page
    -   Click the "+ New Connection" button
    -   A "New Connection" window will open, type "okta" into the search
        box and select the "Okta" icon.
    -   You should now see a screen with four text boxes:
        1.  Connection Nickname
        2.  Domain - without 'https://' or '-admin'. E.g. - 'atko.okta.com'
        3.  Client ID
        4.  Client Secret
    -   Click on the "Need Help?" link at the bottom of the window.
    -   Find the text that says "For additional information, see" and
        click the "Guidance for Okta connector" link.
    -   Follow the instructions in the help window.
        (The short version of these instructions is: Find the "Okta
        Workflows OAuth" app in your Okta Admin Dashboard and copy the
        "Client ID" and "Client secret" values from the "Sign On" tab into
        Workflows)
    -   After following the instructions, click on the "Create" button.
    -   You should see some windows open, and a loading spinner. Then you
        should see a new "Okta" application in your connectors.
-   Activate all of the flows that have been imported and connect
    workflows to your Okta "target" tenant by following the steps below:
    -   Activate the flows the top-level SCIM folder by clicking the
        "ON/OFF" toggle next to each of these flows to activate them:
        1.  SCIM Server
        2.  Periodically Update Resource Counts In the Metadata Table
        3.  SCIM Method Router
    -   Activate the flows in the "Utilities" folder:
        -   Start with the flow named "Update User and Group counts in the
            Metadata Table". Click the "ON/OFF" toggle next to the flow
            named "Update User and Group counts in the Metadata Table". This
            will open the flow and you will be prompted to connect the Okta
            app. Do this by clicking the "Choose Connection" button on the
            first Okta card in the flow and selecting the Okta connection
            that you set up above.
        -   Click the "Save" button for the flow
        -   Click on the "Flows" link at the top of the screen to return to
            the Flows view, from the "Utilities" folder, click on the toggle
            again for the flow named "Update User and Group counts in the
            Metadata Table". It should be enabled now.
    -   Activate *most* of the flows in the HTTP Methods folder
        -   Do the following for each flow *except* for the "Template" and flow labeled "[NOT
            IMPLEMENTED]"
            -   Click the "ON/OFF" toggle next to a flow.
            -   The flow will open. Find the first Okta card and click "Choose
                Connection" at the top of the card.
            -   Select the Okta connection.
            -   Click the "Save" button for the flow.
            -   Click the blue "Save" button on the window that opens up.
            -   Click the "Flows" link at the top of the page.
            -   Click on the "ON/OFF" toggle again, it should activate
            -   Repeat for every flow in the folder except for the two
                mentioned above
-   Secure the SCIM Server by creating a bearer token.
    -   Open the "SCIM" folder then click on the "SCIM Server" workflow to
        open it.
    -   Find the first "Assign" card that contains a text box named
        "authorization<sub>header</sub>" containing the text "Bearer REPLACEME"
    -   Replace the text "REPLACEME" with a secret value.
        A good value to use would be a UUID. Generate a UUID using your
        favorite UUID generator. If you are using macOS you can use the
        `uuidgen` command line utility.
    -   Make sure that the value of the "authorization<sub>header</sub>" text box
        contains only a single line
    -   Click the "Save" button and click the blue "Save" button again to confirm.
-   Get the public URL for the "SCIM Server" workflow.
    -   While looking at the contents of the "SCIM Server" flow from the
        previous step, do the following:
        -   In the very first card, which is labeled "API Endpoint", find
            and click on the small Endpoint Settings icon that looks like this: `</>`
        -   A window labeled "API Endpoint Settings" should open
        -   Copy the first URL in this window, it is labeled "Invoke URL",
            it should look like this: `https://example.workflows.oktapreview.example/api/flo/01ab23cde45fghijklm6n789o0p12345/invoke`


### Verify your configuration

-   Click on the "Flows" link at the top of the Workflows menu
-   Click on the "SCIM" folder, then select the "Tables" tab
-   You should see two tables:
    1.  Offset to Cursor
    2.  Metadata
-   Open the "Metadata" table.
    If the table has two entries, then you're all set. However, it's
    unlikely that this happened unless it's been more than an hour since
    you enabled the "Periodically Update Resource Counts In the Metadata
    Table" flow.
-   If the "Metadata" table is empty, run the "Periodically Update
    Resource Counts In the Metadata Table" flow as follows:
    -   Click "Flows" in the top of the Workflows screen.
    -   Click the "SCIM" folder, then click the "Flows" tab.
    -   Open the flow named "Periodically Update Resource Counts In the
        Metadata Table".
    -   In the card named "Call Flow Async", find the small triangular
        "play" button labeled "Test this card" and click on it.
    -   A window will open up, click the blue "Test" button.
    -   You should briefly see a spinner
    -   Click the grey "Close" button
    -   Follow the steps above to check the "Metadata" table again, you
        should now see that it has two values in it.


## Setting up the Cloudflare Workers Proxy


### Install the Cloudflare Workers Proxy

-   Create a Cloudflare account if you don't have one already: <https://workers.cloudflare.com/>
-   Install or Update the Wrangler command for Cloudflare using this
    guide: <https://developers.cloudflare.com/workers/wrangler/install-and-update/>
-   Test Wrangler by running this command:
    
        wrangler whoami
    
    You should see output with your Account Name and Account ID in it.
-   Open up the `wrangler.toml` file in your favorite text editor
-   Change the URL in the last line of the file to the Invoke URL for
    the "SCIM Server" workflow
-   Save the file
-   Run this command in a terminal to verify that `wrangler.toml` has
    been updated:
    
        git diff
    
    You should see that the WORKFLOW<sub>URL</sub> has been changed.
-   Run this command to deploy the Cloudflare Worker to your account:
    
        wrangler publish
    
    You should see output that looks like this:
    
        Published workflows-scim-relay (3.51 sec)
          https://workflows-scim-relay.example.workers.dev
-   Take note of the last URL in the output, this is the URL that you
    will use to configure SCIM in your "source" Okta Org.


### Test the Cloudflare Workers Proxy

Now it's time to test the Workflows SCIM Relay. We will do this by
making SCIM API requests to the Cloudflare Workers endpoint that was
set up in the step above.

-   Start by making sure that we get an "Unauthorized" message:

    curl 'https://workflows-scim-relay.example.workers.dev/scim/v2/Users'

This should return a JSON payload containing this key:

    {"error":{"message":"Unauthorized"}}

-   Now make the same request, but with the bearer token you set up
    above:
    
        curl -H 'Authorization: Bearer 0A12B345-C6D7-890E-1234-56FG7H8I9JK0' 'https://workflows-scim-relay.example.workers.dev/scim/v2/Users'
    
    This should return a JSON payload that looks something like this:
    
        {
            "startIndex": 1,
            "itemsPerPage": 1,
            "schemas": [
                "urn:ietf:params:scim:api:messages:2.0:ListResponse"
            ],
            "totalResults": 1,
            "Resources": [
                {
                "id": "01a23bcd4efghiJKl5m6",
                "externalId": "",
                "location": "https://workflows-scim-relay.example.workers.dev/scim/v2/Users/01a23bcd4efghiJKl5m6",
                "schemas": [
                    "urn:ietf:params:scim:schemas:core:2.0:User"
                ],
                "active": false,
                "meta": {
                    "resourceType": "User",
                    "created": "2023-07-23T17:05:08.000Z",
                    "location": "",
                    "version": "",
                    "lastModified": "2023-08-09T18:30:51.000Z"
                },
                "emails": [
                    {
                    "value": "joel.franusic@example",
                    "primary": true,
                    "type": "work"
                }
                ],
                "name": {
                    "givenName": "Joel",
                    "formatted": "Joel Franusic",
                    "familyName": "Franusic"
                },
                "userName": "joel.franusic@example",
                "phoneNumbers": []
            }
            ]
        }
    
    If you get a result like the one above, then you know it's working!


# Thanks

Thanks to the following people for their explicit and implicit help in
making this project a reality:

-   Aaron Berman for proposing the idea initially
-   Melisa Chaidez for early feedback and suggestions
-   Brian Zuzga for early feedback
-   Brent Garlow for ongoing encouragement and assistance
-   Max Katz for early gut checks
-   Raj Nadimpalli for writing up the the results of a similar project,
    which validated my approach
-   Nate Callaghan for an early review and feedback

