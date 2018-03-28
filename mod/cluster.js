function chkVals(vals, res) {
  vals.forEach((val) => {
    if (typeof val === 'string' && global.appSettingsValues.indexOf(val) < 0) {
      console.log('Possible SQL injection detected');
      res.status(406).sendFile(appRoot + '/public/dennis_nedry.gif');
    }
  })
  return res;
}

const turf = require('@turf/turf');

async function cluster(req, res) {
  try {

    if (await chkVals([req.query.layer, req.query.geom], res).statusCode === 406) return;

    let xDegree = turf.distance([req.query.west, req.query.north], [req.query.east, req.query.south], { units: 'degrees' });

    let q = `
    SELECT count(1)
    FROM ${req.query.layer}
    WHERE
      ST_DWithin(
        ST_MakeEnvelope(
          ${req.query.west},
          ${req.query.north},
          ${req.query.east},
          ${req.query.south},
          4326),
          ${req.query.geom},
        0.00001
      )
      ${req.query.filter ? `AND ${req.query.competitor} NOT IN ('${req.query.filter.replace(/,/g,"','")}')` : ``}
    `
    let result = await global.DBS[req.query.dbs].query(q);

    let kmeans = parseInt(xDegree * req.query.kmeans) < parseInt(result.rows[0].count) ?
      parseInt(xDegree * req.query.kmeans) :
      parseInt(result.rows[0].count);

    q = `
        SELECT
          ST_AsGeoJson(ST_PointOnSurface(ST_Union(${req.query.geom}))) geomj,
          json_agg(json_build_object('id', id, ${req.query.competitor ? "'competitor', competitor," : ""} 'label', label)) infoj
        FROM (
          SELECT
            id,
            competitor,
            label,
            kmeans_cid,
            ${req.query.geom},
            ST_ClusterDBSCAN(${req.query.geom}, ${xDegree * req.query.dbscan}, 1) OVER (PARTITION BY kmeans_cid) dbscan_cid
          FROM (
            SELECT
              ${req.query.qID} AS id,
              ${req.query.competitor} AS competitor,
              ${req.query.label} AS label,
              ST_ClusterKMeans(${req.query.geom}, ${kmeans}) OVER () kmeans_cid,
              ${req.query.geom}
            FROM ${req.query.layer}
            WHERE
              ST_DWithin(
                ST_MakeEnvelope(
                  ${req.query.west},
                  ${req.query.north},
                  ${req.query.east},
                  ${req.query.south},
                  4326),
                  ${req.query.geom},
                0.00001
              )
              ${req.query.filter? `AND ${req.query.competitor} NOT IN ('${req.query.filter.replace(/,/g,"','")}')` : ``}
            ) kmeans
          ) dbscan
        GROUP BY kmeans_cid, dbscan_cid;`

    //console.log(q);
    result = await global.DBS[req.query.dbs].query(q);

    if (result.rows.length === 0) {
      res.status(204).json({});
    } else {
      res.status(200).json(Object.keys(result.rows).map(record => {
        return {
          type: 'Feature',
          geometry: JSON.parse(result.rows[record].geomj),
          properties: {
            infoj: result.rows[record].infoj
          }
        }
      }));
    }

  } catch (err) {
    console.error(err)
  }
}

module.exports = {
  cluster: cluster
};