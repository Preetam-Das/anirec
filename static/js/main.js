// Create a new web worker instance
const worker = new Worker("/static/js/worker.js");

// Get references to DOM elements
const searchbar = document.getElementById('searchbar');
const suggestbutton = document.getElementById('suggestbutton');
const resetbutton = document.getElementById('resetbutton');
const filterbutton = document.getElementById('filterbutton');
const closebutton = document.getElementById('closebutton');
const fuzzycontainer = document.getElementById('fuzzycontainer');
const fuzzybox = document.getElementById('fuzzybox');
const filterbox = document.getElementById('filterbox');
const selectedbox = document.getElementById('selectedbox');
const recommendationbox = document.getElementById('recommendationbox');
const recommendationdetailedbox = document.getElementById('recommendationdetailedbox');
const imgbox = document.getElementById('imgbox');
const synopsisbox = document.getElementById('synopsisbox');
const paginationbox = document.getElementById('paginationbox');

// Initialize variables for selected and recommended animes
let selectedanimes = {};
let recommendedanimes = [];
let currentpage = 1;
const itemperpage = 99;
let filtering = false;
let flags = {tv: true,
            movie: false,
            nsfw: false};

// Send a message to the worker to fetch initial data
worker.postMessage('fetch');

function setcheckboxes() {
    console.log('Setting default flags.');
    const checkboxes = document.querySelectorAll('input[name="filter"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = flags[checkbox.value];
    });
}

window.onload = setcheckboxes;

// Add an event listener to the search bar to handle input events
searchbar.addEventListener('input', function() {
    const term = searchbar.value.trim();
    if (validate(term)) {
        // Send the search term to the worker for processing
        fuzzycontainer.style.display = 'flex';
        worker.postMessage({type: 'searchterm', data: term});
    } else {
        console.warn("Not a valid search term!!")
        fuzzybox.innerHTML = '';
        fuzzybox.style.display = 'none';
        fuzzycontainer.style.display = 'none';
    }
});

// Check for correct user search term
function validate(str) {
  return /^[a-zA-Z0-9\s]+$/.test(str);
}

// Handle messages received from the worker
worker.onmessage = function(e) {
    if (e.data.type === 'fetchresult') {
        console.log('Fetched anime list from worker');
    }
    if (e.data.type === 'searchresult') {
        handleresult(e.data.data);
    }
}

// Function to handle search results and update the UI
function handleresult(result) {
    if (result.length > 0) {
        fuzzybox.innerHTML = ''; // Clear previous results
        result.slice(0, 100).forEach(res => {
            const animename = res.item.Name;
            const fuzzyitem = document.createElement('div');
            fuzzyitem.classList.add('fuzzyitem');
            fuzzyitem.textContent = animename;
            fuzzyitem.style.whiteSpace = 'nowrap';
            fuzzyitem.addEventListener('click', function () {
                handlefuzzyselection(res.item);
            });
            fuzzybox.appendChild(fuzzyitem);
        });

        // Style the fuzzybox to display results
        fuzzybox.style.display = 'flex';
        fuzzybox.style.flexDirection = 'column';
        fuzzybox.style.maxHeight = '200px';
        fuzzybox.style.overflow = 'hidden';
        fuzzybox.style.overflowY = 'scroll';
        fuzzybox.style.overflowX = 'auto';
    } else {
        fuzzybox.style.display = 'none'; // Hide the fuzzybox if no results
        fuzzycontainer.style.display = 'none'; // Hide the fuzzycontainer if no results
    }
}

// Function to handle the selection of an item from the fuzzybox
function handlefuzzyselection(item) {
    console.log('Selected item:', item);
    if (!selectedanimes[item.anime_id]) {
        selectedanimes[item.anime_id] = item.Name;
        addselecteditems(item); // Add the selected item to the selectedbox
    } else {
        console.warn('Item already selected:', item);
    }
    fuzzybox.innerHTML = ''; // Clear fuzzybox
    fuzzycontainer.style.display = 'none';
    searchbar.value = ''; // Clear search bar
}

// Function to add selected items to the selectedbox
function addselecteditems(animeitem) {
    const selecteditem = document.createElement('div');
    selecteditem.classList.add('selecteditem');
    selecteditem.textContent = animeitem.Name;
    selecteditem.dataset.anime_id = animeitem.anime_id;
    selecteditem.style.whiteSpace = 'nowrap';
    selecteditem.addEventListener('click', function (e) {
        e.target.remove(); // Remove the item from the selectedbox
        delete selectedanimes[e.target.dataset.anime_id]; // Remove from selectedanimes
        console.log('Removed item:', animeitem);
    });
    selectedbox.appendChild(selecteditem);
}

// Reset button functionality to clear all inputs and results
resetbutton.onclick = function(e) {
    searchbar.value = '';
    fuzzybox.innerHTML = '';
    fuzzybox.style.display = 'none';
    fuzzycontainer.style.display = 'none';
    selectedbox.innerHTML = '';
    recommendationbox.innerHTML = '';
    recommendationdetailedbox.style.display = 'None';
    paginationbox.innerHTML = '';
    currentpage = 1;
    selectedanimes = {};
    console.log('Reset all fields');
};

// Suggest button functionality to fetch recommendations based on selected animes
suggestbutton.onclick = function(e) {
    console.log('Selected animes for recommendation:', selectedanimes);
    recommendationdetailedbox.style.display = 'None';
    paginationbox.innerHTML = '';
    currentpage = 1;
    if (Object.keys(selectedanimes).length > 0) {
        getrecommendations(selectedanimes);
    } else {
        console.warn('No animes selected for recommendations');
    }
};

// Function to fetch recommendations from the server
function getrecommendations(selectedanimes) {
    // Create a JSON object with the selected anime IDs
    const data = { selectedanimes: selectedanimes };

    // Send a POST request to the server to get recommendations
    fetch('/recommendations', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(recommendations => {
        // Handle the recommendations received from the server
        recommendedanimes = JSON.parse(recommendations);
        console.log('Recommended Anime IDs:', recommendedanimes);
        displaypage(currentpage); // Display the first page of recommendations
        displaypagecontrols(); // Display pagination controls
    })
    .catch(error => {
        console.error('Error fetching recommendations:', error);
    });
}

// Function to display recommendations for the current page
function displaypage(page) {

    fuzzybox.style.innerHTML = '';
    fuzzybox.style.display = 'none';
    fuzzycontainer.style.display = 'none';

    recommendationbox.innerHTML = '';
    recommendationbox.style.display = 'flex';
    recommendationbox.style.flexDirection = 'row';
    recommendationbox.style.flexWrap = 'wrap';

    const start = (page - 1) * itemperpage;
    const end = Math.min(start + itemperpage, recommendedanimes.length);

    for (i = start; i < end; i++) {
        recommendationbox.style.display = 'none';

        const recommendationitem = document.createElement('div');
        recommendationitem.classList.add('recommendationitem');

        recommendationitem.addEventListener('click',handlerecommendationclick);

        const recommendationimgdiv = document.createElement('div');
        recommendationimgdiv.classList.add('recommendationimgdiv');

        const recommendationimg = document.createElement('img');
        recommendationimg.classList.add('recommendationimg');

        const recommendationimgoverlay = document.createElement('div');
        recommendationimgoverlay.classList.add('recommendationimgoverlay');

        recommendationimgdiv.appendChild(recommendationimg);
        recommendationimgdiv.appendChild(recommendationimgoverlay);

        const recommendationname = document.createElement('div');
        recommendationname.classList.add('recommendationname');

        if (!filteranime(recommendedanimes[i]))
            continue;

        // const anime = recommendedanimes[i];
        // console.log(anime.Type, anime.Rating);

        recommendationitem.dataset.Name = recommendedanimes[i].Name;
        recommendationitem.dataset.imgsrc = recommendedanimes[i]["Image URL"];
        recommendationitem.dataset.synopsis = recommendedanimes[i].Synopsis;
        recommendationimg.src = recommendedanimes[i]["Image URL"];
        recommendationname.textContent = recommendedanimes[i].Name;
        recommendationname.dataset.anime_id = recommendedanimes[i].anime_id;
        // console.log(recommendedanimes[i].Genres[0]);
        // recommendationimgoverlay.textContent = recommendedanimes[i].Genres;
        recommendedanimes[i].Genres.forEach((genre) => {
            const genreitem = document.createElement('span');
            genreitem.innerHTML = genre;
            // console.log(genre);
            recommendationimgoverlay.appendChild(genreitem);
        });

        // recommendationitem.style.whiteSpace = 'nowrap';
        recommendationitem.appendChild(recommendationimgdiv);
        recommendationitem.appendChild(recommendationname);
        recommendationbox.appendChild(recommendationitem);

        recommendationitem.style.display = 'flex';
        recommendationitem.style.flexDirection = 'column';
    }
    recommendationbox.style.display = 'flex';
}

function handlerecommendationclick(e) {
    console.log('Clicked Anime: ' + this.dataset.Name);
    recommendationdetailedbox.style.display = 'flex';

    imgbox.innerHTML = '';
    synopsisbox.innerHTML = '';

    const animeimg = document.createElement('img');
    animeimg.src = this.dataset.imgsrc;

    const animename = document.createElement('span');
    animename.innerHTML = this.dataset.Name;

    synopsisbox.textContent = this.dataset.synopsis;
    imgbox.appendChild(animeimg);
    imgbox.appendChild(animename);
}

function filteranime(anime) {
    if (anime.Type == 'TV') {
        if (!(flags.tv))
            return false;
    }
    if (anime.Type == 'Movie') {
        if (!(flags.movie))
            return false;
    }
    if (anime.Rating.charAt(1) == 'x') {
        if (!(flags.nsfw))
            return false;
    }
    return true;
}

// Function to display pagination controls
function displaypagecontrols() {
    const prevbutton = document.createElement('button');
    const nextbutton = document.createElement('button');
    const pagenumber = document.createElement('div');
    const totalpages = Math.ceil(recommendedanimes.length / itemperpage);

    prevbutton.textContent = 'Previous';
    nextbutton.textContent = 'Next';
    pagenumber.textContent = 'Current page: ' + currentpage;

    pagenumber.style.textAlign = 'center';

    paginationbox.appendChild(pagenumber);
    paginationbox.appendChild(prevbutton);
    paginationbox.appendChild(nextbutton);

    // Disable buttons based on the current page
    prevbutton.disabled = currentpage === 1;
    nextbutton.disabled = currentpage === totalpages;

    // Add event listeners to pagination buttons
    prevbutton.addEventListener('click', () => {
        if (currentpage > 1) {
            currentpage--;
            displaypage(currentpage);
            prevbutton.disabled = currentpage === 1;
            nextbutton.disabled = currentpage === totalpages;
            pagenumber.textContent = 'Current page: ' + currentpage;
        }
    });

    nextbutton.addEventListener('click', () => {
        if (currentpage < totalpages) {
            currentpage++;
            displaypage(currentpage);
            prevbutton.disabled = currentpage === 1;
            nextbutton.disabled = currentpage === totalpages;
            pagenumber.textContent = 'Current page: ' + currentpage;
        }
    });

    paginationbox.style.display = 'flex';
    paginationbox.style.flexDirection = 'row';
    paginationbox.style.flexWrap = 'nowrap';
}

filterbutton.addEventListener("click", function() {
    filtering = !filtering;

    if (filtering) {
        filterbox.style.display = 'flex';
    }
    else {
        filterbox.style.display = 'none';
    }
});

document.querySelectorAll('input[name="filter"]').forEach(checkbox => {
    checkbox.addEventListener('change', function() {
        flags[this.value] = this.checked;
        console.log('Set ' + this.value + ' to ' + this.checked + '.');
    });
});

closebutton.addEventListener('click', function() {
    recommendationdetailedbox.style.display = 'none';
});
