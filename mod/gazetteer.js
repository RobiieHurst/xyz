const { Client } = require('pg');
const DBS = {};
Object.keys(process.env).map(function (key) {
    if (key.split('_')[0] === 'DBS') {
        DBS[key.split('_')[1]] = new Client({ connectionString: process.env[key] });
        DBS[key.split('_')[1]].connect();
    }
});

const request = require('request');

function gazetteer(req, res) {

    // let q = `SELECT label, qid id, source
    //            FROM gaz_${req.query.c}
    //            WHERE search LIKE '${decodeURIComponent(req.query.q).toUpperCase()}%'
    //            ORDER BY searchindex, search LIMIT 10`;

    //console.log(q);

    eval(req.query.provider + '_placesAutoComplete')(req, res);

    // DBS[req.query.dbs].any(q)
    //     .then(function (data) {
    //         if (data.length > 0) {
    //             res.status(200).json(data);
    //         } else {
    //             eval(req.query.p + '_placesAutoComplete')(req, res);
    //         }
    //     })
    //     .catch(() => eval(req.query.p + '_placesAutoComplete')(req, res));
}

// function gazetteer_places(req, res) {
//     let q = "SELECT geomj FROM "
//             + req.query.id.split('.')[0] + " WHERE qid = '"
//             + req.query.id + "'";
//     //console.log(q);

//     db.any(q).then(function (data) {
//         res.status(200).json(data[0].geomj);
//     });
// }

function mapbox_placesAutoComplete(req, res) {
    let q = `https://api.mapbox.com/geocoding/v5/mapbox.places/${req.query.q}.json?`
          + `${req.query.country? 'country=' + req.query.country: ''}`
          + `&types=postcode,district,locality,place,neighborhood,address,poi`
          + `&access_token=${process.env.MAPBOX}`;

    try {
        request.get(q, (err, response, body) => {
            res.status(200).json(JSON.parse(body).features.map(f => {
                return {
                    label: `${f.text} (${f.place_type[0]}) ${!req.query.country && f.context ? ', ' + f.context.slice(-1)[0].text : ''}`,
                    id: f.center,
                    source: 'mapbox'
                }
            }));
        })
    } catch (err) {
        console.log(err.stack)
    }
}

function google_placesAutoComplete(req, res) {
    let q = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${req.query.q}`
          + `${req.query.country ? '&components=country:' + req.query.country : ''}`
          + `&key=${process.env.GKEY}`;

    try {
        request.get(q, (err, response, body) => {
            res.status(200).json(JSON.parse(body).predictions.map(f => {
                return {
                    label: f.description,
                    id: f.place_id,
                    source: 'google'
                }
            }));
        })
    } catch (err) {
        console.log(err.stack)
    }
}

function gazetteer_googleplaces(req, res) {
    let q = `https://maps.googleapis.com/maps/api/place/details/json?placeid=${req.query.id}`
          + `&key=${process.env.GKEY}`;

    try {
        request.get(q, (err, response, body) => {
            let r = JSON.parse(body).result;
            res.status(200).json({
                    type: 'Point',
                    coordinates: [r.geometry.location.lng, r.geometry.location.lat]
                })
        })
    } catch (err) {
        console.log(err.stack)
    }
}

module.exports = {
    gazetteer: gazetteer,
    //gazetteer_places: gazetteer_places,
    gazetteer_googleplaces: gazetteer_googleplaces
};
