require('@tensorflow/tfjs-node');
const cocoSsd = require('@tensorflow-models/coco-ssd');
const fs = require('fs-extra');
const jpeg = require('jpeg-js');
const Bromise = require('bluebird');
const R = require('ramda');
const path = require('path');


const detectImage = (model) =>
    R.pipe(
        R.over(R.lensProp('image'), (x) => model.detect(x)),
        Bromise.props
    );

const readJpg_ = async (path) => jpeg.decode(await fs.readFile(path), true);

const reader = (path) =>
    R.pipe(
        readJpg_,
        R.andThen(R.objOf('image')),
        R.andThen(R.assoc('path', path))
    )(path);


const getPredictions = async () => {
    const imgList = await Bromise.map(
        [
            './images/dog.jpeg',
            './images/panda.jpeg',
            './images/little-red-panda.jpeg',
            './images/cat.jpeg'
        ],
        reader
    );

    // Load the model.
    const model = await cocoSsd.load();

    // Classify the image.
    const predictions = await Bromise.map(imgList, detectImage(model));

    return predictions;
};


const ensureDir = (x) =>
    R.pipe(
        R.path(['image', 0, 'class']),
        R.concat('./images/'),
        fs.ensureDir,
        R.andThen(R.always(x))
    )(x);

const getAbsolutePath = R.pipe(
    R.prop('path'),
    path.resolve
);

const getNewPath = (x) =>
    R.pipe(
        R.prop('path'),
        R.split('/'),
        R.insert(2, R.path(['image', 0, 'class'], x)),
        R.join('/')
    )(x);

const renameAndMoveFile = R.pipe(
    R.converge(fs.move, [getAbsolutePath, getNewPath])
);

const sortImage = R.pipe(
    ensureDir,
    R.andThen(renameAndMoveFile)
);

const sortAll = R.pipe(
    getPredictions,
    R.andThen(R.map(sortImage)),
);

sortAll();
