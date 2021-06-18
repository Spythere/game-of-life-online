## Gra w życie Johna Conway'a

Game of Life to przykład tzw. aparatu komórkowego (*cellular automata*). Gra składa się z planszy podzielonej na równe kwadratowe komórki. Każda komórka może mieć jeden z dwóch stanów - żywy lub martwy. Stan każdej z nich definiuje liczebność jej sąsiedztwa (ile komórek dookoła żyje). 

Zasady gry to:
- Martwa komórka, która ma dokładnie 3 żywych sąsiadów, staje się żywa w następnej jednostce czasu (rodzi się)
- Żywa komórka z 2 albo 3 żywymi sąsiadami pozostaje nadal żywa
- Przy innej liczbie sąsiadów, komórka umiera (z „samotności” albo „zatłoczenia”)

#### [Szczegółówe objaśnienie tematu na Wikipedii][Wikipedia]


Wersja online zawiera tryb multiplayer: każdy ma do dyspozycji tę samą planszę (80x80 z powodów optymalizacyjnych) i może tworzyć na niej swoje własne kształty. Dodatkowo dostępny jest tryb heatmapy, pokazujący, gdzie dochodziło do najwięcej zmian na planszy.

Demo dostępne [tutaj][GoL] (jeśli aplikacja nie chce się załadować, należy chwilę poczekać, aż serwer wyjdzie z uśpienia)

[Wikipedia]: https://pl.wikipedia.org/wiki/Gra_w_%C5%BCycie
[GoL]: https://gol-online2.herokuapp.com
