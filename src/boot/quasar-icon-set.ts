import { defineBoot } from '#q-app/wrappers';
import { IconSet } from 'quasar';
import { iconSetList } from 'src/lib/iconos/iconSetList';

// relative path to your node_modules/quasar/..
// change to YOUR path

// or just a select few (example below with only mdi-v7 and fontawesome-v6):
// import.meta.glob('../../node_modules/quasar/icon-set/(mdi-v7|fontawesome-v6).js')

export default defineBoot(async () => {
  const iconSetName = 'svg-themify'; //'mdi-v7'; // ... some logic to determine it (use Cookies Plugin?)

  try {
    if (iconSetList) {
      await iconSetList[`../../node_modules/quasar/icon-set/${iconSetName}.js`]?.().then(
        (setDefinition) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          IconSet.set((setDefinition as any).default);
        },
      );
    }
  } catch (err) {
    console.error(err);
    // Requested Quasar Icon Set does not exist,
    // let's not break the app, so catching error
  }
});
