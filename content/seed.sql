begin;
with d as (insert into public.decks (language,title,theme,level,description,is_survival,sort_order)
values ('en','Cumprimentos','basico','A1','Oi, tchau, obrigado e o básico de toda conversa.',false,1) returning id)
insert into public.items (deck_id,kind,text_original,text_romanized,translation_pt,respelling_pt,tip_pt,example,example_pt,sort_order) values
((select id from d),'word','Hello',null,'Olá','rê-LOU','O "h" é aspirado, como um "r" bem leve.','Hello, how are you?','Olá, como vai?',0),
((select id from d),'word','Hi',null,'Oi','RAI',null,'Hi, nice to meet you.','Oi, prazer em te conhecer.',1),
((select id from d),'word','Good morning',null,'Bom dia','gud MÓR-nin','O "g" final de "morning" quase some.','Good morning, everyone!','Bom dia, pessoal!',2),
((select id from d),'word','Good night',null,'Boa noite (despedida)','gud NAIT',null,'Good night, see you tomorrow.','Boa noite, até amanhã.',3),
((select id from d),'phrase','Thank you',null,'Obrigado(a)','TÉNK-iu','"th": ponha a ponta da língua entre os dentes e sopre. Não é "f" nem "t".','Thank you so much!','Muito obrigado!',4),
((select id from d),'word','Please',null,'Por favor','PLIIZ','O "s" final soa como "z" vibrando.','A coffee, please.','Um café, por favor.',5),
((select id from d),'word','Sorry',null,'Desculpa','SÓ-ri','O "r" do inglês: a língua não toca o céu da boca.','Sorry, I am late.','Desculpa, estou atrasado.',6),
((select id from d),'phrase','Excuse me',null,'Com licença','eks-KIUZ-mi',null,'Excuse me, where is the bathroom?','Com licença, onde fica o banheiro?',7),
((select id from d),'word','Goodbye',null,'Tchau','gud-BAI',null,'Goodbye, take care!','Tchau, se cuida!',8),
((select id from d),'chunk','Nice to meet you',null,'Prazer em te conhecer','NAIS tu MIIT-iu',null,'Hi Anna, nice to meet you.','Oi Anna, prazer em te conhecer.',9),
((select id from d),'chunk','How are you?',null,'Como vai você?','RAU ar iu','Na fala rápida vira "rau-ar-IU".','Hey John, how are you?','Ei John, como vai?',10),
((select id from d),'chunk','I''m fine',null,'Estou bem','aim FAIN',null,'I''m fine, thanks.','Estou bem, obrigado.',11);
with d as (insert into public.decks (language,title,theme,level,description,is_survival,sort_order)
values ('en','Números','numeros','A1','De um a dez e os números de preço.',false,2) returning id)
insert into public.items (deck_id,kind,text_original,text_romanized,translation_pt,respelling_pt,tip_pt,example,example_pt,sort_order) values
((select id from d),'word','One',null,'Um','UAN',null,'One ticket, please.','Um ingresso, por favor.',0),
((select id from d),'word','Two',null,'Dois','TUU',null,'Two coffees.','Dois cafés.',1),
((select id from d),'word','Three',null,'Três','THRII','"th" com a língua entre os dentes, seguido de "r" inglês.','Three days.','Três dias.',2),
((select id from d),'word','Four',null,'Quatro','FÓR',null,'Four people.','Quatro pessoas.',3),
((select id from d),'word','Five',null,'Cinco','FAIV','Termine com o "v" vibrando, sem "i" no final.','Five dollars.','Cinco dólares.',4),
((select id from d),'word','Six',null,'Seis','SIKS',null,'Six o''clock.','Seis horas.',5),
((select id from d),'word','Seven',null,'Sete','SÉ-vân',null,'Seven days a week.','Sete dias por semana.',6),
((select id from d),'word','Eight',null,'Oito','EIT',null,'Eight hours.','Oito horas.',7),
((select id from d),'word','Nine',null,'Nove','NAIN',null,'Nine minutes.','Nove minutos.',8),
((select id from d),'word','Ten',null,'Dez','TÉN',null,'Ten dollars.','Dez dólares.',9),
((select id from d),'word','Twenty',null,'Vinte','TUÉN-ti','Americanos costumam falar "TUÉ-ni".','Twenty euros.','Vinte euros.',10),
((select id from d),'word','Hundred',null,'Cem','RÂN-dred',null,'One hundred dollars.','Cem dólares.',11);
with d as (insert into public.decks (language,title,theme,level,description,is_survival,sort_order)
values ('en','Aeroporto','viagem','A2','Check-in, embarque e imigração.',true,3) returning id)
insert into public.items (deck_id,kind,text_original,text_romanized,translation_pt,respelling_pt,tip_pt,example,example_pt,sort_order) values
((select id from d),'word','Passport',null,'Passaporte','PÉS-port',null,'Here is my passport.','Aqui está meu passaporte.',0),
((select id from d),'chunk','Boarding pass',null,'Cartão de embarque','BÓR-din pés',null,'Can I see your boarding pass?','Posso ver seu cartão de embarque?',1),
((select id from d),'word','Gate',null,'Portão','GUEIT',null,'Which gate?','Qual portão?',2),
((select id from d),'word','Flight',null,'Voo','FLAIT',null,'My flight is delayed.','Meu voo está atrasado.',3),
((select id from d),'word','Luggage',null,'Bagagem','LÂ-guidj','O final "ge" soa como "dj".','Where is my luggage?','Onde está minha bagagem?',4),
((select id from d),'chunk','Where is the gate?',null,'Onde fica o portão?','UÉR iz dâ GUEIT','"the" = "dâ", com a língua entre os dentes.',null,null,5),
((select id from d),'chunk','I am here on vacation',null,'Estou aqui de férias','ai ém RIR ón vei-KEI-shân',null,null,null,6),
((select id from d),'chunk','I will stay for a week',null,'Vou ficar uma semana','ai uil STEI for â UIIK',null,null,null,7),
((select id from d),'word','Customs',null,'Alfândega','KÂS-tâmz',null,'Go through customs.','Passe pela alfândega.',8),
((select id from d),'word','Delayed',null,'Atrasado','di-LEID',null,'The flight is delayed.','O voo está atrasado.',9);
with d as (insert into public.decks (language,title,theme,level,description,is_survival,sort_order)
values ('en','Restaurante','comida','A2','Pedir, pagar e reclamar.',true,4) returning id)
insert into public.items (deck_id,kind,text_original,text_romanized,translation_pt,respelling_pt,tip_pt,example,example_pt,sort_order) values
((select id from d),'chunk','A table for two, please',null,'Uma mesa para dois, por favor','â TEI-bâl for TUU, pliiz',null,null,null,0),
((select id from d),'chunk','The menu, please',null,'O cardápio, por favor','dâ MÉ-niu, pliiz',null,null,null,1),
((select id from d),'chunk','I''d like...',null,'Eu gostaria de...','aid LAIK',null,'I''d like a burger.','Eu gostaria de um hambúrguer.',2),
((select id from d),'word','Water',null,'Água','UÓ-ter','Americanos falam algo como "UÓ-rer".','Still water, please.','Água sem gás, por favor.',3),
((select id from d),'chunk','The check, please',null,'A conta, por favor','dâ TCHÉK, pliiz',null,null,null,4),
((select id from d),'chunk','How much is it?',null,'Quanto custa?','rau MÂTCH iz it',null,null,null,5),
((select id from d),'word','Delicious',null,'Delicioso','di-LÍ-shâs',null,'This is delicious!','Isso está delicioso!',6),
((select id from d),'word','Chicken',null,'Frango','TCHÍ-kin',null,'Chicken with rice.','Frango com arroz.',7),
((select id from d),'word','Beef',null,'Carne bovina','BIIF',null,'Beef or chicken?','Carne ou frango?',8),
((select id from d),'chunk','To go',null,'Para viagem','tu GOU',null,'For here or to go?','Para comer aqui ou para viagem?',9);
with d as (insert into public.decks (language,title,theme,level,description,is_survival,sort_order)
values ('en','Verbos essenciais','gramatica','A1','Os verbos que aparecem em quase toda frase.',false,5) returning id)
insert into public.items (deck_id,kind,text_original,text_romanized,translation_pt,respelling_pt,tip_pt,example,example_pt,sort_order) values
((select id from d),'word','To be',null,'Ser / estar','tu BII',null,'I want to be happy.','Eu quero ser feliz.',0),
((select id from d),'word','To have',null,'Ter','tu RÉV',null,'I have a car.','Eu tenho um carro.',1),
((select id from d),'word','To go',null,'Ir','tu GOU',null,'I go to work.','Eu vou ao trabalho.',2),
((select id from d),'word','To want',null,'Querer','tu UÓNT',null,'I want coffee.','Eu quero café.',3),
((select id from d),'word','To need',null,'Precisar','tu NIID',null,'I need help.','Eu preciso de ajuda.',4),
((select id from d),'word','To know',null,'Saber / conhecer','tu NOU','O "k" é mudo.','I don''t know.','Eu não sei.',5),
((select id from d),'word','To think',null,'Pensar / achar','tu THINK','"th" com a língua entre os dentes.','I think so.','Acho que sim.',6),
((select id from d),'word','To speak',null,'Falar','tu SPIIK','Comece direto no "s", sem "i" antes: não é "ispik".','Do you speak English?','Você fala inglês?',7),
((select id from d),'word','To understand',null,'Entender','tu ân-der-STÉND',null,'I don''t understand.','Eu não entendo.',8),
((select id from d),'word','To like',null,'Gostar','tu LAIK',null,'I like music.','Eu gosto de música.',9);
with d as (insert into public.decks (language,title,theme,level,description,is_survival,sort_order)
values ('en','Pares mínimos','pronuncia','A2','Palavras quase iguais que brasileiros confundem.',false,6) returning id)
insert into public.items (deck_id,kind,text_original,text_romanized,translation_pt,respelling_pt,tip_pt,example,example_pt,sort_order) values
((select id from d),'word','Ship',null,'Navio','SHIP','"i" curto e relaxado.',null,null,0),
((select id from d),'word','Sheep',null,'Ovelha','SHIIP','"ii" longo e esticado.',null,null,1),
((select id from d),'word','Live',null,'Viver','LIV','"i" curto.',null,null,2),
((select id from d),'word','Leave',null,'Sair / deixar','LIIV','"ii" longo.',null,null,3),
((select id from d),'word','Think',null,'Pensar','THINK','Língua entre os dentes.',null,null,4),
((select id from d),'word','Sink',null,'Pia / afundar','SINK','Língua atrás dos dentes, "s" normal.',null,null,5),
((select id from d),'word','Bad',null,'Ruim','BÉD','Boca bem aberta, entre "é" e "a".',null,null,6),
((select id from d),'word','Bed',null,'Cama','BÉD','Boca menos aberta que em "bad".',null,null,7),
((select id from d),'word','Full',null,'Cheio','FUL','"u" curto.',null,null,8),
((select id from d),'word','Fool',null,'Bobo','FUUL','"uu" longo.',null,null,9);
with d as (insert into public.decks (language,title,theme,level,description,is_survival,sort_order)
values ('ja','Cumprimentos','basico','N5','Aisatsu: as saudações do dia a dia.',false,1) returning id)
insert into public.items (deck_id,kind,text_original,text_romanized,translation_pt,respelling_pt,tip_pt,example,example_pt,sort_order) values
((select id from d),'word','こんにちは','konnichiwa','Olá / boa tarde','kon-ni-tchi-UÁ','O "n" duplo é segurado por um instante.',null,null,0),
((select id from d),'phrase','おはようございます','ohayō gozaimasu','Bom dia (formal)','o-ra-IÔ go-zai-MAS','O "u" final de "masu" quase some.',null,null,1),
((select id from d),'word','こんばんは','konbanwa','Boa noite (cumprimento)','kom-ban-UÁ',null,null,null,2),
((select id from d),'word','ありがとう','arigatō','Obrigado','a-ri-ga-TÔÔ','O "r" japonês é uma batida leve, como em "caro". O "ô" final é longo.',null,null,3),
((select id from d),'word','すみません','sumimasen','Com licença / desculpe','su-mi-ma-SSÊN','"u" bem fraco, quase "smi-ma-ssên".',null,null,4),
((select id from d),'word','はい','hai','Sim','RAI','"h" aspirado, como o "rr" carioca suave.',null,null,5),
((select id from d),'word','いいえ','iie','Não','ii-Ê',null,null,null,6),
((select id from d),'word','さようなら','sayōnara','Adeus','sa-IÔÔ-na-ra',null,null,null,7),
((select id from d),'phrase','おやすみなさい','oyasuminasai','Boa noite (ao dormir)','o-ia-su-mi-na-SSAI',null,null,null,8),
((select id from d),'phrase','はじめまして','hajimemashite','Muito prazer','ra-dji-me-MASH-te','O "i" de "shi" some: "mash-te".',null,null,9),
((select id from d),'chunk','よろしくおねがいします','yoroshiku onegaishimasu','Conto com você / prazer','io-ROSH-ku o-ne-gai-shi-MAS',null,null,null,10),
((select id from d),'chunk','げんきですか','genki desu ka','Tudo bem?','guen-KI dess KA','"desu" soa "dess".',null,null,11);
with d as (insert into public.decks (language,title,theme,level,description,is_survival,sort_order)
values ('ja','Números','numeros','N5','Ichi, ni, san… de 1 a 10, cem e mil.',false,2) returning id)
insert into public.items (deck_id,kind,text_original,text_romanized,translation_pt,respelling_pt,tip_pt,example,example_pt,sort_order) values
((select id from d),'word','いち','ichi','Um','I-tchi',null,null,null,0),
((select id from d),'word','に','ni','Dois','NI',null,null,null,1),
((select id from d),'word','さん','san','Três','SSAN',null,null,null,2),
((select id from d),'word','よん','yon','Quatro','IÔN','Também existe "shi", mas evitam por lembrar "morte".',null,null,3),
((select id from d),'word','ご','go','Cinco','GÔ',null,null,null,4),
((select id from d),'word','ろく','roku','Seis','RO-ku',null,null,null,5),
((select id from d),'word','なな','nana','Sete','NA-na',null,null,null,6),
((select id from d),'word','はち','hachi','Oito','RA-tchi',null,null,null,7),
((select id from d),'word','きゅう','kyū','Nove','KIUU',null,null,null,8),
((select id from d),'word','じゅう','jū','Dez','DJUU',null,null,null,9),
((select id from d),'word','ひゃく','hyaku','Cem','RIÁ-ku',null,null,null,10),
((select id from d),'word','せん','sen','Mil','SSÊN',null,null,null,11);
with d as (insert into public.decks (language,title,theme,level,description,is_survival,sort_order)
values ('ja','Restaurante','comida','N5','Pedir, pagar e agradecer.',true,3) returning id)
insert into public.items (deck_id,kind,text_original,text_romanized,translation_pt,respelling_pt,tip_pt,example,example_pt,sort_order) values
((select id from d),'chunk','これをください','kore o kudasai','Isto, por favor','ko-re o ku-da-SSAI',null,null,null,0),
((select id from d),'chunk','おかいけいおねがいします','okaikei onegaishimasu','A conta, por favor','o-kai-KÊÊ o-ne-gai-shi-MAS',null,null,null,1),
((select id from d),'chunk','いくらですか','ikura desu ka','Quanto custa?','i-KU-ra dess KA',null,null,null,2),
((select id from d),'word','みず','mizu','Água','MI-dzu','"zu" soa "dzu".',null,null,3),
((select id from d),'word','おいしい','oishii','Gostoso','oi-SHII',null,null,null,4),
((select id from d),'phrase','いただきます','itadakimasu','Bom apetite (antes de comer)','i-ta-da-ki-MAS',null,null,null,5),
((select id from d),'phrase','ごちそうさまでした','gochisōsama deshita','Obrigado pela refeição','go-tchi-SSÔÔ-sa-ma desh-TA',null,null,null,6),
((select id from d),'word','ラーメン','rāmen','Lámen','RÁÁ-men',null,null,null,7),
((select id from d),'word','すし','sushi','Sushi','SSU-shi',null,null,null,8),
((select id from d),'word','ビール','bīru','Cerveja','BII-ru','Vogal longa: "bii". Com "i" curto vira "biru" (prédio).',null,null,9);
with d as (insert into public.decks (language,title,theme,level,description,is_survival,sort_order)
values ('ja','Estação e transporte','viagem','N5','Trem, metrô e direções.',true,4) returning id)
insert into public.items (deck_id,kind,text_original,text_romanized,translation_pt,respelling_pt,tip_pt,example,example_pt,sort_order) values
((select id from d),'word','えき','eki','Estação','É-ki',null,null,null,0),
((select id from d),'word','でんしゃ','densha','Trem','DÊN-sha',null,null,null,1),
((select id from d),'word','きっぷ','kippu','Bilhete','KIP-pu','O "pp" duplo tem uma pausa curta antes.',null,null,2),
((select id from d),'chunk','トイレはどこですか','toire wa doko desu ka','Onde fica o banheiro?','to-I-re ua DO-ko dess KA',null,null,null,3),
((select id from d),'chunk','えきはどこですか','eki wa doko desu ka','Onde fica a estação?','É-ki ua DO-ko dess KA',null,null,null,4),
((select id from d),'word','みぎ','migi','Direita','MI-gui',null,null,null,5),
((select id from d),'word','ひだり','hidari','Esquerda','ri-DA-ri',null,null,null,6),
((select id from d),'word','まっすぐ','massugu','Reto / em frente','mas-SSU-gu',null,null,null,7),
((select id from d),'word','ちかてつ','chikatetsu','Metrô','tchi-KA-te-tsu',null,null,null,8),
((select id from d),'phrase','わかりません','wakarimasen','Não entendo','ua-ka-ri-ma-SSÊN',null,null,null,9);
with d as (insert into public.decks (language,title,theme,level,description,is_survival,sort_order)
values ('ja','Pares de vogal longa','pronuncia','N5','Vogal curta × longa muda o sentido da palavra.',false,5) returning id)
insert into public.items (deck_id,kind,text_original,text_romanized,translation_pt,respelling_pt,tip_pt,example,example_pt,sort_order) values
((select id from d),'word','おばさん','obasan','Tia / senhora','o-BA-ssan','"ba" curto.',null,null,0),
((select id from d),'word','おばあさん','obāsan','Avó / idosa','o-BÁÁ-ssan','"báá" esticado.',null,null,1),
((select id from d),'word','ビル','biru','Prédio','BI-ru','"i" curto.',null,null,2),
((select id from d),'word','ビール','bīru','Cerveja','BII-ru','"ii" longo.',null,null,3),
((select id from d),'word','ここ','koko','Aqui','KO-ko',null,null,null,4),
((select id from d),'word','こうこう','kōkō','Ensino médio','KÔÔ-kôô',null,null,null,5),
((select id from d),'word','きて','kite','Venha','KI-te',null,null,null,6),
((select id from d),'word','きって','kitte','Selo','KIT-te','Pausa curta antes do "t".',null,null,7);
with d as (insert into public.decks (language,title,theme,level,description,is_survival,sort_order)
values ('ja','Palavras do dia a dia','basico','N5','Substantivos que aparecem em toda parte.',false,6) returning id)
insert into public.items (deck_id,kind,text_original,text_romanized,translation_pt,respelling_pt,tip_pt,example,example_pt,sort_order) values
((select id from d),'word','ねこ','neko','Gato','NÊ-ko',null,null,null,0),
((select id from d),'word','いぬ','inu','Cachorro','I-nu',null,null,null,1),
((select id from d),'word','ほん','hon','Livro','RÔN',null,null,null,2),
((select id from d),'word','ともだち','tomodachi','Amigo','to-mo-DA-tchi',null,null,null,3),
((select id from d),'word','せんせい','sensei','Professor','ssen-SSÊÊ','"ei" vira um "ê" longo.',null,null,4),
((select id from d),'word','がっこう','gakkō','Escola','gak-KÔÔ',null,null,null,5),
((select id from d),'word','にほん','nihon','Japão','ni-RÔN',null,null,null,6),
((select id from d),'word','にほんご','nihongo','Língua japonesa','ni-RÔN-go',null,null,null,7),
((select id from d),'word','きょう','kyō','Hoje','KIÔÔ',null,null,null,8),
((select id from d),'word','あした','ashita','Amanhã','ash-TA','O "i" de "shi" some.',null,null,9);
with d as (insert into public.decks (language,title,theme,level,description,is_survival,sort_order)
values ('ru','Cumprimentos','basico','A1','Olá, obrigado e o básico de toda conversa.',false,1) returning id)
insert into public.items (deck_id,kind,text_original,text_romanized,translation_pt,respelling_pt,tip_pt,example,example_pt,sort_order) values
((select id from d),'word','Привет','privet','Oi','pri-VIÉT',null,null,null,0),
((select id from d),'word','Здравствуйте','zdravstvuyte','Olá (formal)','ZDRAST-vui-tie','O primeiro "v" não se pronuncia.',null,null,1),
((select id from d),'word','Спасибо','spasibo','Obrigado','spa-SSI-ba','O "o" sem acento vira "a".',null,null,2),
((select id from d),'word','Пожалуйста','pozhaluysta','Por favor / de nada','pa-JÁL-sta',null,null,null,3),
((select id from d),'word','Да','da','Sim','DA',null,null,null,4),
((select id from d),'word','Нет','net','Não','NIÉT',null,null,null,5),
((select id from d),'word','Извините','izvinite','Desculpe','iz-vi-NI-tie',null,null,null,6),
((select id from d),'phrase','До свидания','do svidaniya','Tchau','da-svi-DÁ-ni-ia',null,null,null,7),
((select id from d),'chunk','Как дела?','kak dela?','Tudo bem?','kak di-LA',null,null,null,8),
((select id from d),'chunk','Меня зовут…','menya zovut…','Meu nome é…','mi-NIÁ za-VUT',null,null,null,9);
with d as (insert into public.decks (language,title,theme,level,description,is_survival,sort_order)
values ('ru','Números','numeros','A1','De um a dez.',false,2) returning id)
insert into public.items (deck_id,kind,text_original,text_romanized,translation_pt,respelling_pt,tip_pt,example,example_pt,sort_order) values
((select id from d),'word','Один','odin','Um','a-DIN',null,null,null,0),
((select id from d),'word','Два','dva','Dois','DVA',null,null,null,1),
((select id from d),'word','Три','tri','Três','TRI','O "r" é vibrado, como em espanhol.',null,null,2),
((select id from d),'word','Четыре','chetyre','Quatro','tchi-TÍ-rie',null,null,null,3),
((select id from d),'word','Пять','pyat','Cinco','PIAT',null,null,null,4),
((select id from d),'word','Шесть','shest','Seis','SHÉST',null,null,null,5),
((select id from d),'word','Семь','sem','Sete','SSÉM',null,null,null,6),
((select id from d),'word','Восемь','vosem','Oito','VÓ-ssiem',null,null,null,7),
((select id from d),'word','Девять','devyat','Nove','DIÉ-viat',null,null,null,8),
((select id from d),'word','Десять','desyat','Dez','DIÉ-ssiat',null,null,null,9);
with d as (insert into public.decks (language,title,theme,level,description,is_survival,sort_order)
values ('ru','Restaurante','comida','A2','Pedir, pagar e agradecer.',true,3) returning id)
insert into public.items (deck_id,kind,text_original,text_romanized,translation_pt,respelling_pt,tip_pt,example,example_pt,sort_order) values
((select id from d),'chunk','Меню, пожалуйста','menyu, pozhaluysta','O cardápio, por favor','mi-NIU, pa-JÁL-sta',null,null,null,0),
((select id from d),'chunk','Счёт, пожалуйста','schyot, pozhaluysta','A conta, por favor','SHIÓT, pa-JÁL-sta',null,null,null,1),
((select id from d),'chunk','Сколько стоит?','skolko stoit?','Quanto custa?','SKÓL-ka STÓ-it',null,null,null,2),
((select id from d),'word','Вода','voda','Água','va-DA',null,null,null,3),
((select id from d),'word','Кофе','kofe','Café','KÓ-fie',null,null,null,4),
((select id from d),'word','Чай','chay','Chá','TCHAI',null,null,null,5),
((select id from d),'word','Хлеб','khleb','Pão','RLIÉP','O "х" é um "r" raspado na garganta.',null,null,6),
((select id from d),'word','Вкусно','vkusno','Gostoso','FKUS-na',null,null,null,7),
((select id from d),'chunk','Я хочу…','ya khochu…','Eu quero…','ia ra-TCHU',null,null,null,8),
((select id from d),'chunk','Без мяса','bez myasa','Sem carne','biez MIÁ-ssa',null,null,null,9);
with d as (insert into public.decks (language,title,theme,level,description,is_survival,sort_order)
values ('fr','Cumprimentos','basico','A1','Bonjour, merci e o básico de toda conversa.',false,1) returning id)
insert into public.items (deck_id,kind,text_original,text_romanized,translation_pt,respelling_pt,tip_pt,example,example_pt,sort_order) values
((select id from d),'word','Bonjour',null,'Bom dia / olá','bon-JUR','"on" é nasal, como em "bom".','Bonjour, ça va ?','Olá, tudo bem?',0),
((select id from d),'word','Bonsoir',null,'Boa noite (cumprimento)','bon-SUAR',null,null,null,1),
((select id from d),'word','Salut',null,'Oi / tchau (informal)','sa-LÜ','"u" francês: diga "i" com os lábios em bico.',null,null,2),
((select id from d),'word','Merci',null,'Obrigado','mér-SSI','O "r" é raspado na garganta.','Merci beaucoup !','Muito obrigado!',3),
((select id from d),'phrase','S''il vous plaît',null,'Por favor','sil vu PLÉ',null,null,null,4),
((select id from d),'word','Pardon',null,'Desculpe','par-DON',null,null,null,5),
((select id from d),'word','Oui',null,'Sim','UI',null,null,null,6),
((select id from d),'word','Non',null,'Não','NON',null,null,null,7),
((select id from d),'phrase','Au revoir',null,'Tchau','ô rre-VUAR',null,null,null,8),
((select id from d),'chunk','Comment ça va ?',null,'Como vai?','ko-MAN sa VA',null,null,null,9);
with d as (insert into public.decks (language,title,theme,level,description,is_survival,sort_order)
values ('fr','Números','numeros','A1','De um a dez.',false,2) returning id)
insert into public.items (deck_id,kind,text_original,text_romanized,translation_pt,respelling_pt,tip_pt,example,example_pt,sort_order) values
((select id from d),'word','Un',null,'Um','AN','Nasal.',null,null,0),
((select id from d),'word','Deux',null,'Dois','DÖ','"eu": diga "ê" com os lábios em bico.',null,null,1),
((select id from d),'word','Trois',null,'Três','TRUÁ',null,null,null,2),
((select id from d),'word','Quatre',null,'Quatro','KATR',null,null,null,3),
((select id from d),'word','Cinq',null,'Cinco','SSANK',null,null,null,4),
((select id from d),'word','Six',null,'Seis','SSIS',null,null,null,5),
((select id from d),'word','Sept',null,'Sete','SSÉT',null,null,null,6),
((select id from d),'word','Huit',null,'Oito','ÜIT',null,null,null,7),
((select id from d),'word','Neuf',null,'Nove','NÖF',null,null,null,8),
((select id from d),'word','Dix',null,'Dez','DIS',null,null,null,9);
with d as (insert into public.decks (language,title,theme,level,description,is_survival,sort_order)
values ('fr','Restaurante','comida','A2','Pedir, pagar e agradecer.',true,3) returning id)
insert into public.items (deck_id,kind,text_original,text_romanized,translation_pt,respelling_pt,tip_pt,example,example_pt,sort_order) values
((select id from d),'chunk','L''addition, s''il vous plaît',null,'A conta, por favor','la-di-SSIÔN, sil vu PLÉ',null,null,null,0),
((select id from d),'chunk','Je voudrais…',null,'Eu gostaria de…','je vu-DRÉ',null,'Je voudrais un café.','Eu gostaria de um café.',1),
((select id from d),'chunk','C''est combien ?',null,'Quanto custa?','sé kon-BIAN',null,null,null,2),
((select id from d),'word','L''eau',null,'A água','LÔ',null,null,null,3),
((select id from d),'word','Le pain',null,'O pão','le PAN',null,null,null,4),
((select id from d),'word','Le fromage',null,'O queijo','le fro-MAJ',null,null,null,5),
((select id from d),'word','Le vin',null,'O vinho','le VAN',null,null,null,6),
((select id from d),'word','Délicieux',null,'Delicioso','de-li-SSIÖ',null,null,null,7),
((select id from d),'chunk','Une table pour deux',null,'Uma mesa para dois','ün TABL pur DÖ',null,null,null,8),
((select id from d),'chunk','Sans viande',null,'Sem carne','san VIAND',null,null,null,9);
commit;
