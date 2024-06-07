# imports
from flask import Flask, render_template, jsonify, request
import json
import pickle as pkl
import numpy as np
import pandas as pd
from sklearn.metrics.pairwise import cosine_similarity
from scipy.sparse import csr_matrix, hstack, vstack, save_npz, load_npz

# Flask init
app = Flask(__name__)

# Load anime data
# animedf = pkl.load(open('static/db/animelist.pkl', 'rb'))
animedf = pkl.load(open('static/db/cdf_v2.pkl', 'rb'))[['Name','anime_id']]
animejson = animedf.to_json(orient='records')
item_profile = load_npz('static/db/item_profile_v2.npz')
cdf = pkl.load(open('static/db/cdf_v2.pkl', 'rb'))

# Create User profile
def create_user_profile(anime_list):
        idx_list = []
        for anime in anime_list:
            idx_list.append(cdf.index[cdf['Name'] == anime_list[anime]][0])
        # print(idx_list)
        user_profile = vstack([item_profile[idx] for idx in idx_list]).mean(axis=0)
        return csr_matrix(user_profile)

# Generate recommendations and send as json
def generate_recommendation(anime_list):
    user_profile = create_user_profile(anime_list)
    sim_matrix = cosine_similarity(user_profile, item_profile)
    recs = sim_matrix.argsort()[0][::-1]
    dummydf = cdf.loc[recs][['Name','anime_id', 'Genres', 'Synopsis', 'Type','Rating','Image URL']]
    return dummydf.to_json(orient='records')

# Main page endpoint
@app.route('/')
def hello():
    return render_template("index.html")

# Anime data endpoint
@app.route('/animelist')
def getanimelist():
    return jsonify(animejson)

# Recommendations endpoint
@app.route('/recommendations', methods=['POST'])
def recommend():
    selected_anime_ids = request.json.get('selectedanimes', [])
    recommended_anime_ids = generate_recommendation(selected_anime_ids)
    return jsonify(recommended_anime_ids)
