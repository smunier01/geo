import json
import copy
from pprint import pprint
from subprocess import call
import subprocess

def _formatGeo(d):
    dd = copy.deepcopy(d)
    
    for key, value in d.items():
        if value is None:
            del dd[key]

    return dd

def formatGeo(d):
    
    for key, value in d.items():

        if key == 'features':
            for value2 in value:
                value2['id'] = value2['properties']['osm_id']
                v2 = _formatGeo(value2['properties'])
                value2['properties'] = v2

    return d


# conv
call(['ogr2ogr', '-f', 'GeoJSON' ,'out_lines.json', 'PG:host=localhost dbname=gis2 user=postgres password=', '-sql', "select * from planet_osm_line WHERE osm_id>=0"])
call(['ogr2ogr', '-f', 'GeoJSON' ,'out_polygons.json', 'PG:host=localhost dbname=gis2 user=postgres password=', '-sql', 'select * from planet_osm_polygon'])

json_data_lines = json.load(open('out_lines.json'))
json_data_polygons = json.load(open('out_polygons.json'))

lines = formatGeo(json_data_lines)
polygons = formatGeo(json_data_polygons)

with open('lines.geojson', 'w') as f:
    json.dump(lines, f)

with open('polygons.geojson', 'w') as f:
    json.dump(polygons, f)

call(['rm', '-rf', 'out_lines.json'])
call(['rm', '-rf', 'out_polygons.json'])
