var path = require('path');
var fs = require('fs');
//要遍历的文件夹所在的路径
var rnRootFilePath = path.resolve('../ReactNative/');
var imgFilePath = path.resolve('../img/');
const filterImage = [".JPEG",".jpeg",".JPG",".jpg",".png",".gif",".webp",".svg"]
let allImages = [];
let allUsedImagesSet = new Set()

var readdir = promisify(fs.readdir);
var stat = promisify(fs.stat);

function promisify(fn) {
    return function() {
        var args = arguments;
        return new Promise(function(resolve, reject) {
            [].push.call(args, function(err, result) {
                if(err) {
                reject(err);
                }else {
                resolve(result);
                }
            });
            fn.apply(null, args);
        });
    }
}
/**
 *筛选未使用的图片资源
 *
 * @param {*} arr1 所有的图片资源数组
 * @param {*} arr2 已使用的图片资源数组
 * @returns
 */
function filterUnusedImages(arr1,arr2){
    var result=[];
    arr1.forEach(function(x){
        let has = arr2.some((info)=>{
            let match = x.path.endsWith(info)
            if (!match) {
                let splitIndex = info.indexOf('.')
                let twoImage = info.substring(0,splitIndex)+'@2x'+info.substring(splitIndex)
                let threeImage = info.substring(0,splitIndex)+'@3x'+info.substring(splitIndex)
                match = x.path.endsWith(twoImage) || x.path.endsWith(threeImage)
            }
            return match
        })
        if (!has) {
            result.push(x);
        } else {
            return;
        }
    })
    return result;
}
/**
 *判断文件是否是图片
 *
 * @param {*} string 文件路径
 * @returns 
 */
function contantImage(string){
    return filterImage.some(function(value){return string.endsWith(value)});
}
/**
 *文件大小单位转换
 *
 * @param {*} size 文件大小(byte)
 * @returns
 */
function calculateSize(size) {
    if (!size || size < 0) {
        return '0';
    }
    if (size > 1024 * 1024) {
        return Math.ceil(size/(1024 * 1024)) + 'M';
    } else if (size > 1024) {
        return Math.ceil(size/1024) + 'KB';
    } else {
        return size + 'B'
    }
}
/**
 *遍历文件夹下的所有文件
 *
 * @param {*} file 待遍历的文件夹路径
 * @param {*} callback
 * @returns
 */
function readDirRecur(file, callback) {
    return readdir(file).then(function(files) {
        files = files.map(function(filename) {
            //获取当前文件的绝对路径
            var fullPath = path.join(file, filename);
            //fs.stat 根据文件路径获取文件信息，返回一个fs.Stats对象
            return stat(fullPath).then(function(stats) {
                if (stats.isDirectory()) {
                    return readDirRecur(fullPath, callback);
                }else{
                    if(filename[0] == '.'){
                        // console.log(fullPath + ' 是隐藏文件 忽略');
                    }else{
                        return dealFile(filename,fullPath,stats,callback)
                    }
                }
            })
        });
        return Promise.all(files);
    });
}
/**
 *分门别类处理文件-图片存储到图片数组、JS文件查找使用的图片资源存到使用中的图片数组中
 *
 * @param {*} filename
 * @param {*} fullPath
 * @param {*} stats
 * @param {*} callback
 */
function dealFile(filename,fullPath,stats,callback) {
    if (contantImage(fullPath)) {
        allImages.push({
            path: fullPath,
            size: calculateSize(stats.size)
        })
        callback(filename, fullPath);
    } else if (fullPath.endsWith('.js')) {
        var fileContent = fs.readFileSync(fullPath, 'utf-8');
        let ph = /require\([^\)]+\)/g
        var matchResult = fileContent.match(ph)
        if (matchResult) {
            var requirePaths = (matchResult.toString()).split(',')
            requirePaths.forEach((imagePath)=>{
                var imageIndex = imagePath.search(/\/+[^.].+[png|PNG|jpeg|GPEG|gif|GIF|jpg|JPG|webp|WEBP|svg|SVG]/)
                if (imageIndex != -1) {
                    var imageName = imagePath.substring(imageIndex,imagePath.length-2)
                    var images = imageName.split('/')
                    var image = images[images.length-1]
                    if (!allUsedImagesSet.has(image)) {
                        allUsedImagesSet.add(image)
                    }
                    
                } else {
                    // console.log('非图片资源')
                }
            })
        }
        callback(filename, fullPath);
    } else {
        // console.log(fullPath + '非目标文件 忽略')
    }
}
readDirRecur(imgFilePath, function(item, fullPath) {
    // console.log(fullPath);
    }).then(function() {
        readDirRecur(rnRootFilePath, function(item, fullPath) {
            // console.log(fullPath);
        }).then(function() {
            let allUsedImages = Array.from(allUsedImagesSet)
            let unUsedImages = filterUnusedImages(allImages,allUsedImages)
            unUsedImages.forEach((info)=>{
                console.log(info)
            })
            console.log('所有的图片资源数量：' + allImages.length)
            console.log('使用的图片资源数量：' + allUsedImages.length)
            console.log('未使用的图片资源数量：' + unUsedImages.length)
            console.log('done');
        }).catch(function(err) {
            console.log(err);
        });
    }).catch(function(err) {
        console.log(err);
    }
);
