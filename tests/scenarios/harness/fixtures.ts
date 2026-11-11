/**
 * Puntos de partida reutilizables para los escenarios de "La caza de la oveja salvaje"
 * (equivalen a cargar una partida guardada en ese momento de la aventura).
 */
import type { ScenarioInitialState } from './runner';

export const OVEJA_ADVENTURE = 'public/adventures/la-caza-de-la-oveja-salvaje/la-caza-de-la-oveja-salvaje.json';

/** Flags tras recoger el pergamino y que Merryl lo lea con éxito. */
export const PERGAMINO_LEIDO_FLAGS = {
    took_scroll_speak_with_animals: true,
    identified_scroll_speak_with_animals: true,
    consumed_scroll_speak_with_animals: true,
    speak_with_animals: true,
};

const HISTORIA_PERGAMINO: ScenarioInitialState['history'] = [
    { sender: 'Player', senderName: 'Galador', content: 'Cojo el pergamino que la oveja lleva en la boca y se lo paso a Merryl para que lo lea.' },
    {
        sender: 'DM',
        content: 'Merryl despliega el pergamino y pronuncia las palabras arcanas. El papel se deshace en ceniza dorada y, de pronto, los balidos de la oveja se convierten en palabras que todos podéis entender.',
    },
];

/** El grupo ya puede hablar con la oveja, en la plaza, antes de que aparezca Guz. */
export const TRAS_LEER_PERGAMINO: ScenarioInitialState = {
    locationId: 'ciudad-o-pueblo',
    globalFlags: { ...PERGAMINO_LEIDO_FLAGS },
    history: HISTORIA_PERGAMINO,
};

/** Guz, sus lobos y el oso acaban de llegar a la plaza reclamando a la oveja. */
export const GUZ_EN_LA_PLAZA: ScenarioInitialState = {
    locationId: 'ciudad-o-pueblo',
    globalFlags: { ...PERGAMINO_LEIDO_FLAGS, guz_aparece: true },
    history: [
        ...HISTORIA_PERGAMINO!,
        {
            sender: 'DM',
            content: 'Un semiorco corpulento irrumpe en la plaza seguido de tres lobos y un enorme oso pardo. «Esa oveja es mía», gruñe Guz, señalando al animal. «Entregádmela y nadie saldrá herido.»',
        },
    ],
};

/** Guz ha sido derrotado y el grupo sabe que debe ir a la torre de Noke. */
export const GUZ_DERROTADO: ScenarioInitialState = {
    locationId: 'ciudad-o-pueblo',
    globalFlags: { ...PERGAMINO_LEIDO_FLAGS, 'guz-semiorco_derrotado': true },
    history: [
        ...HISTORIA_PERGAMINO!,
        {
            sender: 'DM',
            content: 'Tras la pelea, Guz yace inconsciente y sus bestias han huido. La oveja os explica que su antiguo aprendiz vive en una torre en el bosque, a pocas millas de aquí, y os ruega que la acompañéis.',
        },
    ],
};
