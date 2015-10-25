#!/usr/bin/env python

import sys, getopt, json, csv
from subprocess import call

try:
    opts, args = getopt.getopt(sys.argv[1:], "d:o:")
    
except getopt.GetoptError as err:

    print(sys.argv[0],'-o <outputfile> -d <dboptions>')
    print('example :', sys.argv[0], '-o routing.json -d "PG:host=localhost dbname=routing user=postgres password=postgres"')
    sys.exit(2)

for opt, arg in opts:
    if opt == "-o":
        fOutput = arg
    elif opt == "-d":
        db = arg
    else:
        assert False, "unhandled option"

call(['ogr2ogr', '-f', 'CSV', 'out_tmp.csv', db, '-sql', "select gid, length, x1, y1, x2, y2, osm_id, ST_AsText(the_geom) as geom, source, target from ways"])
    
    # conversion du csv en json

fInput = 'out_tmp.csv'

csvfile = open(fInput, 'r')
jsonfile = open(fOutput, 'w')

csv_reader = csv.DictReader(csvfile)

jsonfile.write(json.dumps([r for r in csv_reader]))

csvfile.close()
jsonfile.close()

call(['rm', '-rf', 'out_tmp.csv'])
