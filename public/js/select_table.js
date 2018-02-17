const utils = require('./utils');
const images = require('./select_images');

function addInfojToList(record) {

    // Create infojTable table to be returned from this function.
    let table = utils.createElement('table', {
        className: 'infojTable',
        cellPadding: '0',
        cellSpacing: '0',
        style: 'border-bottom: 1px solid ' + record.color
    });
            
    // Populate the table from the features infoj object.
    Object.keys(record.layer.infoj).map(function (key) {

        // Create new table row at given level and append to table.
        let tr = utils.createElement('tr', {
            className: 'lv-' + (record.layer.infoj[key].level || 0)
        });
        table.appendChild(tr);

        // Create new table cell for label and append to table.
        if (record.layer.infoj[key].label){
            let label = utils.createElement('td', {
                className: 'label lv-' + (record.layer.infoj[key].level || 0),
                textContent: record.layer.infoj[key].label,
                colSpan: (!record.layer.infoj[key].type || record.layer.infoj[key].type === 'text' ? '2' : '1')
            });
            tr.appendChild(label);

            // return from object.map function if field(label) has no type.
            if (!record.layer.infoj[key].type) return
        }

        // Create new row for text cells and append to table.
        if (record.layer.infoj[key].type && (record.layer.infoj[key].type === 'text' || record.layer.infoj[key].type === 'text[]')){
            tr = document.createElement('tr');
            table.appendChild(tr);
        }

        // Create new table cell for values and append to tr.
        let val = utils.createElement('td', {
            className: 'val',
            colSpan: '2'
        });
        tr.appendChild(val);

        // If input is images create image control and return from object.map function.
        if (record.layer.infoj[key].images) {
            val.appendChild(images.addImages(record, record.layer.infoj[key].value.reverse() || []));
            return
        }

        // Set field value if layer is not editable and return from object.map function.
        if (!record.layer.editable && record.layer.infoj[key].value) {
            val.textContent = record.layer.infoj[key].value;
            return
        }

        // Create select input for options.
        if (record.layer.infoj[key].range) {
            val.textContent = record.layer.infoj[key].value || record.layer.infoj[key].range[0];
            tr = document.createElement('tr');
            table.appendChild(tr);
            let range = utils.createElement('td', {
                colSpan: '2'              
            })
            tr.appendChild(range);
            let rangeInput = utils.createElement('input', {
                type: 'range',
                value: record.layer.infoj[key].value || record.layer.infoj[key].range[0],
                min: record.layer.infoj[key].range[0],
                max: record.layer.infoj[key].range[1]
            })
            rangeInput.addEventListener('input', function(){
                val.textContent = this.value;
            });
            range.appendChild(rangeInput);
            return
        }

        // Create select input for options.
        if (record.layer.infoj[key].options) {
            let select = document.createElement('select');
            Object.keys(record.layer.infoj[key].options).map(function (i) {
                select.appendChild(utils.createElement('option', {
                    textContent: record.layer.infoj[key].options[i],
                    value: i,
                    selected: (record.layer.infoj[key].options[i] === record.layer.infoj[key].value)
                }));
            });
            val.appendChild(select);
            return
        }

        // Creat input for editable fields
        if (record.layer.editable) {
            val.appendChild(utils.createElement('input', {
                name: record.layer.infoj[key].field,
                value: record.layer.infoj[key].value,
                type: 'text'
            }));
        }
        
    });

    return table;
}

module.exports = {
    addInfojToList: addInfojToList
}