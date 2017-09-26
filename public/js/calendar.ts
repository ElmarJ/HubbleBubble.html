// Client ID and API key from the Developer Console
        const CLIENT_ID = '889012243145-4ov1voghuk72q9k4k32pseqcrc5gg02b.apps.googleusercontent.com';

        // Array of API discovery doc URLs for APIs used by the quickstart
        const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest"];

        // Authorization scopes required by the API; multiple scopes can be
        // included, separated by spaces.
        const SCOPES = "https://www.googleapis.com/auth/calendar";

        const authorizeButton = document.getElementById('authorize-button');

        /**
         *  On load, called to load the auth2 library and API client library.
         */
        function handleGoogleClientLoad() {
            gapi.load('client:auth2', initGoogleClient);
        }


        /**
         *  Initializes the API client library and sets up sign-in state
         *  listeners.
         */
        async function initGoogleClient() {
            await gapi.client.init({
                discoveryDocs: DISCOVERY_DOCS,
                clientId: CLIENT_ID,
                scope: SCOPES
            });
            
            // Listen for sign-in state changes.
            gapi.auth2.getAuthInstance().isSignedIn.listen(updateSigninStatus);

            // Handle the initial sign-in state.
            updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
                // authorizeButton.onclick = handleAuthClick;
        }

        /**
         *  Called when the signed in status changes, to update the UI
         *  appropriately. After a sign-in, the API is called.
         */
        function updateSigninStatus(isSignedIn) {
            if (isSignedIn) {
                // authorizeButton.style.display = 'none';
                showCurrentEvent();
                navigateToScheduledHubble();
            } else {
                // authorizeButton.style.display = 'block';
            }
        }

        /**
         *  Sign in the user upon button click.
         */
        function handleAuthClick(event) {
            gapi.auth2.getAuthInstance().signIn();
        }

        /**
         *  Sign out the user upon button click.
         */
        function handleSignoutClick(event) {
            gapi.auth2.getAuthInstance().signOut();
        }


        function setupProgressIndiciator() {}


        async function linkEventToHubble(hubble: Hubble, event: gapi.client.calendar.Event) {
            event.extendedProperties.private["linked-bubble"] = hubble.hubbleKey;

            const response = await gapi.client.calendar.events.update({
                calendarId: "primary",
                eventId: event.id,
                resource: event
            });

            return response.result;
        }

        async function getLinkedEvents(hubble: Hubble){
            const response = await gapi.client.calendar.events.list({
                'calendarId': 'primary',
                'showDeleted': false,
                'singleEvents': true,
                'maxResults': 10,
                'orderBy': 'startTime',
                'privateExtendedProperty': 'linked-hubble-key=' + hubble.hubbleKey
            });
            return response.result.items;
        }

        function getLinkedHubble(event: gapi.client.calendar.Event) {
            return new Hubble(event.extendedProperties.private["linked-hubble-key"]);
        }

        async function getCurrentEvents() {
            if (!gapi.client || !gapi.client.calendar) {
                return null;
            }

            const now = new Date();
            const soon = new Date();
            soon.setMinutes(soon.getMinutes() + 1); // apparently, you don't get current event if timeMax = timeMin;
            
            const response = await gapi.client.calendar.events.list({
                'calendarId': 'primary',
                'timeMin': now.toISOString(),
                'timeMax': soon.toISOString(),
                'showDeleted': false,
                'singleEvents': true,
                'maxResults': 10,
                'orderBy': 'startTime'
            });

            return response.result.items;
        }

        function getFractionPassedOfEvent(event: gapi.client.calendar.Event) {
            var start = event.start.dateTime;
            var end = event.end.dateTime;
            
            if (!start) {
                start = event.start.date;
                end = event.end.date;
            }
            
            var startTime = new Date(start);
            var endTime = new Date(end);
            var now = new Date();

            return (now.getTime() - startTime.getTime()) / (endTime.getTime() - startTime.getTime());
        }

        async function createLinkedEvent(startsAt: Date, endsAt: Date, hubble: Hubble) {
            const eventData: gapi.client.calendar.EventInput = {
                summary: await hubble.content.get(),
                start: { dateTime: startsAt.toISOString() },
                end: { dateTime: endsAt.toISOString() },
                extendedProperties: {
                    private: {
                        "linked-hubble-key": hubble.hubbleKey
                    }
                }
            };

            const response = await gapi.client.calendar.events.insert({
                calendarId: 'primary',
                resource: eventData
              });
              
            return response.result;
        }

        async function schedule(startsAt: Date, endsAt: Date, hubble: Hubble) {
            const event = await createLinkedEvent(startsAt, endsAt, hubble);
            // Todo: we should check whether this actually is now the first upcoming
            //    scheduled date.
            if (startsAt > new Date()) {
                hubble.scheduled.set(startsAt);
            }

        }            