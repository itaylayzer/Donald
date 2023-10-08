export type Cookie = {
    characters: { [name: string]: CookieCharacter };
};
export type CookieCharacter = {
    eyes: number | false;
    hair: number | false;
    mouth: number | false;
    glassess: number | false;
};
