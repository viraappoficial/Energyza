# Trabalhos realizados (galeria do site)

O eletricista gerencia em **Mais → Trabalhos** (`/admin/trabalhos`). Cada trabalho tem foto, título (até 80 letras) e descrição (até 160).

- **Adicionar / editar / apagar**, **subir e descer** na ordem e **ocultar** do site sem apagar.
- Na home, a seção "Trabalhos realizados" mostra os itens ativos. Com 1 ou 2 itens ficam lado a lado; com 3 ou mais vira carrossel que passa sozinho a cada 4,5 s (para com o dedo/mouse em cima e respeita "reduzir movimento"), com bolinhas e setas.
- **Fotos**: o celular reduz a foto antes de subir (fotos de câmera passam de 4 MB, o limite do servidor); o servidor corrige a rotação, limita a 1600 px, converte em JPEG e **remove os metadados (inclui localização GPS)**. Ficam no banco (`works.image_data`) e são servidas em `/api/trabalhos/<id>/foto` com cache longo (a URL muda quando a foto é trocada).
- Limite de 40 trabalhos. Migração `0007_works.sql` já cadastra as duas fotos iniciais (Prime Barbearia), que também podem ser editadas ou apagadas.
- Cuidado ao publicar fotos: sem rostos de clientes, sem telefones/placas de terceiros e com autorização de quem é dono do local.
