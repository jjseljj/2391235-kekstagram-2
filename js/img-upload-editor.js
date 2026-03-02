import {
  SCALE_STEP,
  SCALE_MIN,
  SCALE_MAX,
  SCALE_DEFAULT,
  EFFECTS
} from './img-upload-config.js';

const overlayElement = document.querySelector('.img-upload__overlay');
const previewImageElement = overlayElement.querySelector('.img-upload__preview img');

const scaleSmallerButton = overlayElement.querySelector('.scale__control--smaller');
const scaleBiggerButton = overlayElement.querySelector('.scale__control--bigger');
const scaleValueInput = overlayElement.querySelector('.scale__control--value');

const effectsListElement = overlayElement.querySelector('.effects__list');
const effectLevelFieldset = overlayElement.querySelector('.img-upload__effect-level');
const effectLevelValue = overlayElement.querySelector('.effect-level__value');
const sliderElement = overlayElement.querySelector('.effect-level__slider');

let currentScale = SCALE_DEFAULT;
let currentEffect = 'none';

const resetEffectClass = () => {
  previewImageElement.classList.forEach((cls) => {
    if (cls.startsWith('effects__preview--')) {
      previewImageElement.classList.remove(cls);
    }
  });
};

const applyScale = (value) => {
  currentScale = value;
  scaleValueInput.value = `${currentScale}%`;
  previewImageElement.style.transform = `scale(${currentScale / 100})`;
};

const clampScale = (value) => Math.min(SCALE_MAX, Math.max(SCALE_MIN, value));

const onScaleSmallerClick = () => {
  applyScale(clampScale(currentScale - SCALE_STEP));
};

const onScaleBiggerClick = () => {
  applyScale(clampScale(currentScale + SCALE_STEP));
};

const setEffectLevelVisibility = (effectName) => {
  if (effectName === 'none') {
    effectLevelFieldset.classList.add('hidden');
  } else {
    effectLevelFieldset.classList.remove('hidden');
  }
};

const applyEffect = (effectName, level) => {
  const config = EFFECTS[effectName];

  if (effectName === 'none') {
    previewImageElement.style.filter = '';
    effectLevelValue.value = '';
    return;
  }

  const value = Number(level);
  previewImageElement.style.filter = `${config.filter}(${value}${config.unit})`;
  effectLevelValue.value = String(value);
};

const updateSliderForEffect = (effectName) => {
  const config = EFFECTS[effectName];

  setEffectLevelVisibility(effectName);

  if (!sliderElement.noUiSlider) {
    noUiSlider.create(sliderElement, {
      range: config.range,
      start: config.start,
      step: config.step,
      connect: 'lower',
      format: {
        to: (value) => Number(value),
        from: (value) => Number(value),
      },
    });

    sliderElement.noUiSlider.on('update', () => {
      const value = sliderElement.noUiSlider.get();
      applyEffect(currentEffect, value);
    });
  } else {
    sliderElement.noUiSlider.updateOptions(
      {
        range: config.range,
        step: config.step,
        start: config.start,
      },
      true
    );
  }

  sliderElement.noUiSlider.set(config.start);
};

const resetEffects = () => {
  currentEffect = 'none';
  resetEffectClass();
  previewImageElement.style.filter = '';
  setEffectLevelVisibility('none');

  if (sliderElement.noUiSlider) {
    sliderElement.noUiSlider.set(EFFECTS.none.start);
  }

  effectLevelValue.value = '';
};

const onEffectsChange = (evt) => {
  const target = evt.target;
  if (!target.classList.contains('effects__radio')) {
    return;
  }

  currentEffect = target.value;

  resetEffectClass();
  previewImageElement.style.filter = '';

  if (currentEffect === 'none') {
    resetEffects();
    return;
  }

  previewImageElement.classList.add(`effects__preview--${currentEffect}`);
  updateSliderForEffect(currentEffect);
};

export const resetEditor = () => {
  applyScale(SCALE_DEFAULT);
  resetEffects();

  const noneRadio = overlayElement.querySelector('#effect-none');
  if (noneRadio) {
    noneRadio.checked = true;
  }
};

export const initUploadEditor = () => {
  applyScale(SCALE_DEFAULT);
  setEffectLevelVisibility('none');

  scaleSmallerButton.addEventListener('click', onScaleSmallerClick);
  scaleBiggerButton.addEventListener('click', onScaleBiggerClick);
  effectsListElement.addEventListener('change', onEffectsChange);

  if (!sliderElement.noUiSlider) {
    updateSliderForEffect('none');
  }
};
