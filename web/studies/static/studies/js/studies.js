/*
Элементы страницы
*/


const loadStudyButton =
    document.getElementById(
        "loadStudyButton"
    );


const studyListModalElement =
    document.getElementById(
        "studyListModal"
    );


const studyListModal =
    new bootstrap.Modal(
        studyListModalElement
    );


const studyList =
    document.getElementById(
        "studyList"
    );


const folderInput =
    document.getElementById(
        "studyFolder"
    );


const fileInfo =
    document.getElementById(
        "fileInfo"
    );

const anonymizationInfo =
    document.getElementById(
        "anonymizationInfo"
    );


const changedFields =
    document.getElementById(
        "changedFields"
    );


const removedFields =
    document.getElementById(
        "removedFields"
    );


const studyInfo =
    document.getElementById(
        "studyInfo"
    );


const studyId =
    document.getElementById(
        "studyId"
    );


const patientName =
    document.getElementById(
        "patientName"
    );


const accessionNumber =
    document.getElementById(
        "accessionNumber"
    );


const studyFileCount =
    document.getElementById(
        "studyFileCount"
    );


const studyStatus =
    document.getElementById(
        "studyStatus"
    );


const topogramButton =
    document.getElementById(
        "topogramButton"
    );


const segmentButton =
    document.getElementById(
        "segmentButton"
    );


const classifyButton =
    document.getElementById(
        "classifyButton"
    );


const processingStatus =
    document.getElementById(
        "processingStatus"
    );


const topogramImage =
    document.getElementById(
        "topogramImage"
    );


const resultText =
    document.getElementById(
        "resultText"
    );


let currentStudyId = null;


/*
Получение CSRF-токена
*/

function getCsrfToken() {

    const csrfToken =
        document.querySelector(
            "[name=csrfmiddlewaretoken]"
        );

    if (!csrfToken) {
        return null;
    }

    return csrfToken.value;
}


/*
Сброс состояния страницы
*/

function resetStudyInterface() {

    currentStudyId = null;


    studyInfo.style.display =
        "none";


    anonymizationInfo.style.display =
        "none";


    changedFields.innerHTML =
        "";


    removedFields.innerHTML =
        "";


    topogramButton.disabled =
        true;


    segmentButton.disabled =
        true;


    classifyButton.disabled =
        true;


    processingStatus.textContent =
        "Ожидание исследования";


    processingStatus.classList.remove(
        "status-ready"
    );


    topogramImage.style.display =
        "none";


    topogramImage.src =
        "";


    resultText.style.display =
        "block";


    resultText.innerHTML =
        "<p>Здесь будет отображаться сканограмма</p>";
}


/*
Отображение результата анонимизации
*/

function showAnonymizationResult(
    anonymization
) {

    if (!anonymization) {
        return;
    }


    changedFields.innerHTML =
        "";


    removedFields.innerHTML =
        "";


    if (
        anonymization.changed &&
        anonymization.changed.length > 0
    ) {

        for (
            const field
            of anonymization.changed
        ) {

            const item =
                document.createElement(
                    "div"
                );


            item.className =
                "anonymization-item";


            item.textContent =
                "✓ " + field;


            changedFields.appendChild(
                item
            );
        }
    }


    if (
        anonymization.removed &&
        anonymization.removed.length > 0
    ) {

        for (
            const field
            of anonymization.removed
        ) {

            const item =
                document.createElement(
                    "div"
                );


            item.className =
                "anonymization-item";


            item.textContent =
                "✓ " + field;


            removedFields.appendChild(
                item
            );
        }
    }


    anonymizationInfo.style.display =
        "block";
}


/*
Загрузка исследования
*/

folderInput.addEventListener(
    "change",
    async function () {

        const files = this.files;


        resetStudyInterface();


        if (files.length === 0) {

            fileInfo.textContent =
                "Исследование не выбрано";

            return;
        }


        fileInfo.textContent =
            "Выбрано файлов: " +
            files.length;


        processingStatus.textContent =
            "Загрузка и анонимизация исследования...";


        const formData =
            new FormData();


        for (
            const file of files
        ) {

            formData.append(
                "studyFolder",
                file
            );
        }


        try {

            const csrfToken =
                getCsrfToken();


            const response =
                await fetch(
                    "/upload/",
                    {
                        method: "POST",

                        body: formData,

                        headers: {
                            "X-CSRFToken":
                                csrfToken
                        }
                    }
                );


            const data =
                await response.json();


            console.log(
                "Ответ Django:",
                data
            );


            if (!response.ok || !data.success) {

                processingStatus.textContent =
                    "Ошибка загрузки";


                alert(
                    "Ошибка: " +
                    (
                        data.error ||
                        "Не удалось обработать исследование"
                    )
                );


                return;
            }


            currentStudyId =
                data.study_id;


            processingStatus.textContent =
                "Исследование загружено";


            processingStatus.classList.add(
                "status-ready"
            );


            /*
            Отображение результата анонимизации
            */

            showAnonymizationResult(
                data.anonymization
            );


            /*
            Отображение информации
            об исследовании
            */

            studyInfo.style.display =
                "block";


            studyId.textContent =
                data.study_id;


            patientName.textContent =
                data.patient_name;


            accessionNumber.textContent =
                data.accession_number;


            studyFileCount.textContent =
                data.file_count;


            studyStatus.textContent =
                data.status;


            /*
            Следующий этап становится
            доступен только после
            успешной загрузки
            */

            topogramButton.disabled =
                false;


            segmentButton.disabled =
                true;


            classifyButton.disabled =
                true;
        }


        catch (error) {

            console.error(
                "Ошибка загрузки:",
                error
            );


            processingStatus.textContent =
                "Ошибка соединения с сервером";


            alert(
                "Не удалось загрузить исследование"
            );
        }
    }
);


/*
Отображение топограммы
*/

topogramButton.addEventListener(
    "click",
    async function () {

        if (!currentStudyId) {
            return;
        }


        topogramButton.disabled =
            true;


        processingStatus.textContent =
            "Поиск топограммы...";


        try {

            const csrfToken =
                getCsrfToken();


            const response =
                await fetch(
                    `/detect-topogram/${currentStudyId}/`,
                    {
                        method: "POST",

                        headers: {
                            "X-CSRFToken":
                                csrfToken
                        }
                    }
                );


            const data =
                await response.json();


            console.log(
                "Ответ поиска топограммы:",
                data
            );


            if (!response.ok || !data.success) {

                processingStatus.textContent =
                    "Топограмма не найдена";


                alert(
                    "Ошибка: " +
                    (
                        data.error ||
                        "Топограмма не найдена"
                    )
                );


                topogramButton.disabled =
                    false;


                return;
            }


            processingStatus.textContent =
                "Топограмма отображена";


            processingStatus.classList.add(
                "status-ready"
            );


            topogramImage.src =
                data.image_url;


            topogramImage.style.display =
                "block";


            resultText.style.display =
                "none";


            segmentButton.disabled =
                false;


            classifyButton.disabled =
                true;


            console.log(
                "Путь:",
                data.path
            );


            console.log(
                "Series UID:",
                data.series_uid
            );


            console.log(
                "Описание:",
                data.series_description
            );
        }


        catch (error) {

            console.error(
                "Ошибка поиска топограммы:",
                error
            );


            processingStatus.textContent =
                "Ошибка поиска топограммы";


            alert(
                "Не удалось найти топограмму"
            );


            topogramButton.disabled =
                false;
        }
    }
);


/*
Определение границ областей
*/

segmentButton.addEventListener(
    "click",
    async function () {

        if (!currentStudyId) {
            return;
        }


        segmentButton.disabled =
            true;


        processingStatus.textContent =
            "Определение областей...";


        try {

            const csrfToken =
                getCsrfToken();


            const response =
                await fetch(
                    `/detect-boundaries/${currentStudyId}/`,
                    {
                        method: "POST",

                        headers: {
                            "X-CSRFToken":
                                csrfToken
                        }
                    }
                );


            const data =
                await response.json();


            console.log(
                "Результат определения областей:",
                data
            );


            if (!response.ok || !data.success) {

                processingStatus.textContent =
                    "Ошибка определения областей";


                alert(
                    "Ошибка: " +
                    (
                        data.error ||
                        "Не удалось определить области"
                    )
                );


                segmentButton.disabled =
                    false;


                return;
            }


            processingStatus.textContent =
                "Области определены";


            processingStatus.classList.add(
                "status-ready"
            );


            classifyButton.disabled =
                false;
        }


        catch (error) {

            console.error(
                "Ошибка определения областей:",
                error
            );


            processingStatus.textContent =
                "Ошибка определения областей";


            alert(
                "Не удалось определить области"
            );


            segmentButton.disabled =
                false;
        }
    }
);


/*
Классификация поперечных срезов
*/

classifyButton.addEventListener(
    "click",
    async function () {

        if (!currentStudyId) {
            return;
        }


        classifyButton.disabled =
            true;


        processingStatus.textContent =
            "Классификация изображений...";


        try {

            const csrfToken =
                getCsrfToken();


            const response =
                await fetch(
                    `/classify-study/${currentStudyId}/`,
                    {
                        method: "POST",

                        headers: {
                            "X-CSRFToken":
                                csrfToken
                        }
                    }
                );


            const data =
                await response.json();


            console.log(
                "Результат классификации:",
                data
            );


            if (!response.ok || !data.success) {

                processingStatus.textContent =
                    "Ошибка классификации";


                alert(
                    "Ошибка: " +
                    (
                        data.error ||
                        "Не удалось выполнить классификацию"
                    )
                );


                classifyButton.disabled =
                    false;


                return;
            }


            processingStatus.textContent =
                "Классификация завершена";


            processingStatus.classList.add(
                "status-ready"
            );
        }


        catch (error) {

            console.error(
                "Ошибка классификации:",
                error
            );


            processingStatus.textContent =
                "Ошибка классификации";


            alert(
                "Не удалось выполнить классификацию"
            );


            classifyButton.disabled =
                false;
        }
    }
);
loadStudyButton.addEventListener(
    "click",
    async function () {

        studyList.innerHTML =
            "Загрузка...";

        studyListModal.show();

        try {

            const response =
                await fetch(
                    "/studies/list/"
                );

            const data =
                await response.json();

            if (
                !response.ok ||
                !data.success
            ) {

                studyList.textContent =
                    "Не удалось загрузить список исследований";

                return;
            }

            studyList.innerHTML =
                "";

            if (
                data.studies.length === 0
            ) {

                studyList.textContent =
                    "Ранее загруженных исследований нет.";

                return;
            }

            for (
                const study
                of data.studies
            ) {

                const item =
                    document.createElement(
                        "div"
                    );

                item.className =
                    "study-list-item";

                item.innerHTML = `

                    <div>

                        <div>
                            <strong>
                                Исследование №${study.id}
                            </strong>
                        </div>

                        <div>
                            Пациент:
                            ${study.patient_name}
                        </div>

                        <div>
                            Идентификатор:
                            ${study.accession_number}
                        </div>

                        <div>
                            Файлов:
                            ${study.file_count}
                        </div>

                        <div>
                            Статус:
                            ${study.status}
                        </div>

                        <div>
                            Загружено:
                            ${study.created_at}
                        </div>

                    </div>

                    <button
                        type="button"
                        class="btn btn-blue"
                        data-study-id="${study.id}"
                    >
                        Открыть
                    </button>

                `;

                studyList.appendChild(item);
            }


            /*
             * Обработчик кнопок "Открыть"
             */

            studyList
                .querySelectorAll("[data-study-id]")
                .forEach(function (button) {

                    button.addEventListener(
                        "click",
                        function () {

                            const selectedStudyId =
                                this.dataset.studyId;

                            const selectedStudy =
                                data.studies.find(
                                    function (study) {

                                        return String(study.id) ===
                                            String(selectedStudyId);

                                    }
                                );

                            if (!selectedStudy) {

                                alert(
                                    "Не удалось найти выбранное исследование"
                                );

                                return;
                            }


                            /*
                             * Запоминаем выбранное исследование
                             */

                            currentStudyId =
                                selectedStudy.id;


                            /*
                             * Заполняем информацию
                             * об исследовании
                             */

                            studyId.textContent =
                                selectedStudy.id;

                            patientName.textContent =
                                selectedStudy.patient_name;

                            accessionNumber.textContent =
                                selectedStudy.accession_number;

                            studyFileCount.textContent =
                                selectedStudy.file_count;

                            studyStatus.textContent =
                                selectedStudy.status;


                            /*
                             * Показываем информацию
                             */

                            studyInfo.style.display =
                                "block";


                            /*
                             * Анонимизация уже была выполнена
                             */

                            anonymizationInfo.style.display =
                                "none";


                            /*
                             * Обновляем статус
                             */

                            processingStatus.textContent =
                                "Исследование выбрано";

                            processingStatus.classList.add(
                                "status-ready"
                            );


                            /*
                             * Разрешаем следующий этап
                             */

                            topogramButton.disabled =
                                false;

                            segmentButton.disabled =
                                true;

                            classifyButton.disabled =
                                true;


                            /*
                             * Закрываем модальное окно
                             */

                            studyListModal.hide();

                        }
                    );

                });

        }
        catch (error) {

            console.error(
                "Ошибка загрузки списка исследований:",
                error
            );

            studyList.textContent =
                "Не удалось загрузить список исследований";
        }
    }
);