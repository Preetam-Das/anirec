// Import the Fuse.js library for fuzzy search
importScripts('node_modules/fuse.js/dist/fuse.min.js');

// Declare a variable to store the Fuse.js search instance
var fusesearch;

// Listen for messages from the main thread
onmessage = function(e) {
    // If the message is 'fetch', fetch the anime list from the server
    if (e.data == 'fetch') {
        fetch('/animelist')
            .then(response => {
                // Check if the response is OK
                if (response.ok) {
                    // Parse the JSON response
                    return response.json();
                }
            })
            .then(data => {
                // Parse the JSON data
                const animelist = JSON.parse(data);
                // Initialize the Fuse.js search instance with the anime list
                fusesearch = new Fuse(animelist, { keys: ['Name', 'anime_id'] });
                // Send a message back to the main thread with the fetched anime list
                postMessage({ type: "fetchresult", data: animelist });
            });
    }
    // If the message type is 'searchterm', perform a fuzzy search
    if (e.data.type == 'searchterm') {
        // Get the search term from the message data
        const term = e.data.data;
        // Log the search term for debugging
        console.log("Worker: " + term);
        // Perform a fuzzy search using Fuse.js
        const result = fusesearch.search(term);
        // Send the search result back to the main thread
        postMessage({ type: 'searchresult', data: result });
    }
}
