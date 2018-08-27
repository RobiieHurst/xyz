module.exports = { get };

async function get(req, res, fastify) {

    const token = req.query.token ?
        fastify.jwt.decode(req.query.token) : { access: 'public' };

    let
        layer = global.workspace[token.access].config.locales[req.query.locale].layers[req.query.layer],
        geom = layer.geom ? layer.geom : 'geom',
        table = req.query.table,
        size = req.query.size,
        color = req.query.color,
        properties = req.query.properties ? `,${req.query.properties}` : ``,
        west = parseFloat(req.query.west),
        south = parseFloat(req.query.south),
        east = parseFloat(req.query.east),
        north = parseFloat(req.query.north);

    // Check whether string params are found in the settings to prevent SQL injections.
    if ([table, geom, size, color]
        .some(val => (typeof val === 'string' && global.workspace[token.access].values.indexOf(val) < 0))) {
        return res.code(406).send('Parameter not acceptable.');
    }

    var q = `
    SELECT
        lon,
        lat,
        ${size} size,
        ${color} color
        ${properties}
    FROM ${table}
    WHERE
        ST_DWithin(
            ST_MakeEnvelope(${west}, ${south}, ${east}, ${north}, 4326),
            ${geom}, 0.000001)
        AND ${size} >= 1 LIMIT 10000;`;

      //  console.log(q);

    var db_connection = await fastify.pg[layer.dbs].connect();
    var result = await db_connection.query(q);
    db_connection.release();

    if (result.rows.length === 0) return res.code(204).send();

    //console.log(result.rows);

    let q_result = {
        properties: {},
        data: []
    };

    Object.values(result.rows).map(entry => {
        Object.keys(entry).map(key => {
            let index = req.query.properties.split(",").indexOf(key);
            if(index > -1){
                q_result.properties[key] = entry[key];
            } else {
                q_result.data.push(entry[key]);
            }
        });
    });

    console.log(JSON.stringify(q_result));

    res.code(200).send(Object.keys(result.rows).map(record => {
        return Object.keys(result.rows[record]).map(field => {
            return result.rows[record][field];
            /*return {
                "result": result.rows[record][field],
            }*/
        });
    }));
}