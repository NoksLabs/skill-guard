import * as Effect from 'effect/Effect';
                                                     
                                                           

export const isDirectory = (
  fs                       ,
  path        ,
)                                                      =>
  fs
    .exists(path)
    .pipe(
      Effect.flatMap((exists) =>
        exists
          ? fs.stat(path).pipe(Effect.map((stats) => stats.type === 'Directory'))
          : Effect.succeed(false),
      ),
    );
