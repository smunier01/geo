#!/usr/bin/env python

import json
import copy
from pprint import pprint
from subprocess import call
import getopt, sys

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

try:
    opts, args = getopt.getopt(sys.argv[1:], "d:")
    
except getopt.GetoptError as err:
    print(sys.argv[0],'-d <dboptions>')
    print('example :', sys.argv[0], '-d "PG:host=localhost dbname=routing user=gis password=postgres"')
    sys.exit(2)

for opt, arg in opts:
    if opt == "-d":
        db = arg
    else:
        assert False, "unhandled option"

# conv
call(['ogr2ogr', '-f', 'GeoJSON' ,'out_lines.json', db, '-sql', "select * from planet_osm_line WHERE osm_id>=0 AND power IS NULL AND barrier IS NULL AND boundary IS NULL"])
# call(['ogr2ogr', '-f', 'GeoJSON' ,'out_polygons.json', db, '-sql', 'select * from planet_osm_polygon'])
call(['ogr2ogr', '-f', 'GeoJSON' ,'out_polygons.json', db, '-sql', "SELECT * FROM planet_osm_polygon as a left join (SELECT DISTINCT osm_id, array_to_string(array_agg(DISTINCT CASE WHEN CONCAT(s.name,',',s.url) = ',' THEN NULL ELSE CONCAT(s.name,',',s.url) END), ';') as services FROM (planet_osm_polygon left join services_batiments on osm_id=id_batiment) left join services as s on s.id=id_service GROUP BY osm_id) as b on a.osm_id=b.osm_id"])


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
