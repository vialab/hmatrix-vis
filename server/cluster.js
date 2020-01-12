var clusterMaker = require('clusters');
 
//number of clusters, defaults to undefined 
//clusterMaker.k(2);
 
//number of iterations (higher number gives more time to converge), defaults to 1000 
clusterMaker.iterations(1500);
 
//data from which to identify clusters, defaults to [] 
clusterMaker.data([[0, 3, 1], [ 1,4,0], [2,0,3], [ 0, 4, 4 ], [ 4, 0, 2 ], [ 4, 2, 0 ] ,[ 0, 3, 3 ], [ 3, 0, 2 ], [ 3, 2, 0 ] , [ 0, 3, 2 ], [ 3, 0, 2 ], [ 2, 2, 0 ] ,  [ 0, 2, 3 ], [ 2, 0, 2 ], [ 3, 2, 0 ] , [ 0, 3, 2 ], [ 3, 0, 2 ], [ 2, 2, 0 ]  ]);
//clusterMaker.data([['democr', 0.6], ['democrati', 0.65], ['demo', 0.5], ['democratization', 1.0], ['demotn', 0.72]]);
 
console.log(clusterMaker.clusters()[2].points[3]);

function returnCluster(data, points){
    var cluster = [], index=0;
    for (var i=0;i<points.length;i++){
        for (var j=0;j<data.length;j++){        
            if (isVectorEqual(points[i],data[j])){
                cluster[index] = j;
                index++;
            }
        }        
    }
    return cluster;    
}

function uniqueVectors(points){
    var unique = [], index=0;
    for(var i=0; i<points.length; i++){
        for(var j=0; j<data.length; j++){
            if(!isVectorEqual(points[i],data[j])){
                unique[index]=points[i];
                index++;
            }            
        }
    }
    return unique;    
}

function isVectorEqual(v1, v2){
    if (v1.length!=v2.length)
        return false;
    for (var i=0; i<v1.length;i++){
        if (v1[i]!=v2[i])
            return false;
    }
    return true;
}
 
// { centroid: [10.5 , 11], points: [[10, 10], [11, 12]] }, 
// { centroid: [-9.5, 10.5], points: [[-10, 10], [-9, 11]] }, 
// { centroid: [0.3333333333333333, 0.3333333333333333], points: [[1, 0], [0, 1], [0, 0]] }